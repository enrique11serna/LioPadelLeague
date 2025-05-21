import os
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from datetime import datetime
from src.models import db
from src.models.match import Match, MatchParticipation
from src.models.rating import PlayerRating, MatchPhoto
from src.models.card import CardAssignment
from src.routes.auth import token_required

result_bp = Blueprint('result', __name__)

# Carpeta para subir fotos
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'static/uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@result_bp.route('/matches/<int:match_id>/result', methods=['POST'])
@token_required
def submit_result(match_id):
    """Registrar el resultado del partido y actualizar estado."""
    user = g.current_user
    data = request.get_json() or {}
    winner_team = data.get('winner_team')  # 1 o 2

    match = Match.query.get(match_id)
    if not match:
        return jsonify({'success': False, 'message': 'Partido no encontrado'}), 404
    if match.created_by_id != user.id:
        return jsonify({'success': False, 'message': 'Solo el creador puede registrar resultado'}), 403
    if match.status != 'open' and match.status != 'in_progress':
        return jsonify({'success': False, 'message': 'Resultado ya registrado o partido cancelado'}), 400

    if winner_team not in (1, 2):
        return jsonify({'success': False, 'message': 'winner_team inválido'}), 400

    match.winner_team = winner_team
    match.status = 'completed'
    db.session.commit()

    # Activar posibilidad de valoración y fotos
    return jsonify({'success': True, 'message': 'Resultado guardado'}), 200

@result_bp.route('/matches/<int:match_id>/ratings', methods=['POST'])
@token_required
def submit_ratings(match_id):
    """Enviar valoraciones de este usuario a los otros jugadores del partido."""
    user = g.current_user
    data = request.get_json() or {}
    ratings = data.get('ratings', [])  # lista dicts: {'rated_id', 'rating', 'comment'}

    match = Match.query.get(match_id)
    if not match or match.status != 'completed':
        return jsonify({'success': False, 'message': 'Partido no completado o no existe'}), 400

    participation = MatchParticipation.query.filter_by(
        match_id=match_id, user_id=user.id
    ).first()
    if not participation:
        return jsonify({'success': False, 'message': 'No jugaste este partido'}), 403

    # Check that ratings contains exactly 3 entries for other players
    others = [p.user_id for p in match.participations if p.user_id != user.id]
    if len(ratings) != len(others):
        return jsonify({'success': False, 'message': 'Debes valorar a los otros 3 jugadores'}), 400

    # Guardar cada valoración
    for r in ratings:
        rated_id = r.get('rated_id')
        score = r.get('rating')
        comment = r.get('comment', '')
        if rated_id not in others or not (1 <= score <= 10):
            return jsonify({'success': False, 'message': 'Valoración inválida'}), 400
        existing = PlayerRating.query.filter_by(
            match_id=match_id, rater_id=user.id, rated_id=rated_id
        ).first()
        if existing:
            continue
        pr = PlayerRating(
            match_id=match_id,
            rater_id=user.id,
            rated_id=rated_id,
            rating=score,
            comment=comment
        )
        db.session.add(pr)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Valoraciones guardadas'}), 200

@result_bp.route('/matches/<int:match_id>/photos', methods=['POST'])
@token_required
def upload_photo(match_id):
    """Subir una foto del partido tras completarlo."""
    user = g.current_user
    match = Match.query.get(match_id)
    if not match or match.status != 'completed':
        return jsonify({'success': False, 'message': 'Solo tras partido completado'}), 400

    participation = MatchParticipation.query.filter_by(
        match_id=match_id, user_id=user.id
    ).first()
    if not participation:
        return jsonify({'success': False, 'message': 'No jugaste este partido'}), 403

    if 'photo' not in request.files:
        return jsonify({'success': False, 'message': 'No hay fichero'}), 400
    file = request.files['photo']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Fichero no permitido'}), 400

    filename = secure_filename(f"match{match_id}_user{user.id}_{int(datetime.utcnow().timestamp())}.{file.filename.rsplit('.',1)[1]}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    mp = MatchPhoto(match_id=match_id, user_id=user.id, file_path=filepath)
    db.session.add(mp)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Foto subida', 'data': {'file_path': filepath}}), 201
