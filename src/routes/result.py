from flask import Blueprint, request, jsonify, current_app
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from src.models import db
from src.models.match import Match, MatchParticipation
from src.models.rating import PlayerRating, MatchPhoto
from src.routes.auth import token_required

result_bp = Blueprint('result', __name__)

# Configuración para subida de archivos
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'static', 'uploads', 'match_photos')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@result_bp.route('/matches/<int:match_id>/result', methods=['POST'])
@token_required
def submit_result(current_user, match_id):
    # Obtener partido
    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({'message': 'Partido no encontrado'}), 404
    
    # Verificar que el partido está en progreso
    if match.status != 'in_progress':
        return jsonify({'message': 'Este partido no está en progreso'}), 400
    
    # Verificar si el usuario está participando
    participation = MatchParticipation.query.filter_by(
        match_id=match.id,
        user_id=current_user.id
    ).first()
    
    if not participation:
        return jsonify({'message': 'No estás participando en este partido'}), 403
    
    data = request.get_json()
    
    # Validar datos requeridos
    if not data or not data.get('winner_team') or data.get('winner_team') not in [1, 2]:
        return jsonify({'message': 'Equipo ganador requerido (1 o 2)'}), 400
    
    # Actualizar resultado del partido
    match.winner_team = data['winner_team']
    match.status = 'completed'
    db.session.commit()
    
    return jsonify({
        'message': 'Resultado registrado correctamente',
        'match': match.to_dict()
    }), 200

@result_bp.route('/matches/<int:match_id>/ratings', methods=['POST'])
@token_required
def submit_ratings(current_user, match_id):
    # Obtener partido
    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({'message': 'Partido no encontrado'}), 404
    
    # Verificar que el partido está completado
    if match.status != 'completed':
        return jsonify({'message': 'Este partido no está completado'}), 400
    
    # Verificar si el usuario está participando
    participation = MatchParticipation.query.filter_by(
        match_id=match.id,
        user_id=current_user.id
    ).first()
    
    if not participation:
        return jsonify({'message': 'No estás participando en este partido'}), 403
    
    data = request.get_json()
    
    # Validar datos requeridos
    if not data or not data.get('ratings') or not isinstance(data['ratings'], list):
        return jsonify({'message': 'Valoraciones requeridas'}), 400
    
    # Obtener todos los participantes del partido
    participations = MatchParticipation.query.filter_by(match_id=match.id).all()
    participant_ids = [p.user_id for p in participations]
    
    # Verificar que el usuario no se está valorando a sí mismo
    for rating_data in data['ratings']:
        if not rating_data.get('user_id') or not rating_data.get('rating'):
            return jsonify({'message': 'Datos de valoración incompletos'}), 400
        
        rated_id = rating_data['user_id']
        rating_value = rating_data['rating']
        comment = rating_data.get('comment', '')
        
        # Verificar que el usuario valorado es un participante
        if rated_id not in participant_ids:
            return jsonify({'message': 'Usuario valorado no es participante del partido'}), 400
        
        # Verificar que el usuario no se está valorando a sí mismo
        if rated_id == current_user.id:
            return jsonify({'message': 'No puedes valorarte a ti mismo'}), 400
        
        # Verificar que la valoración está en el rango correcto
        if not isinstance(rating_value, int) or rating_value < 1 or rating_value > 10:
            return jsonify({'message': 'La valoración debe ser un número entre 1 y 10'}), 400
        
        # Verificar si ya existe una valoración
        existing_rating = PlayerRating.query.filter_by(
            match_id=match.id,
            rater_id=current_user.id,
            rated_id=rated_id
        ).first()
        
        if existing_rating:
            # Actualizar valoración existente
            existing_rating.rating = rating_value
            existing_rating.comment = comment
        else:
            # Crear nueva valoración
            new_rating = PlayerRating(
                match_id=match.id,
                rater_id=current_user.id,
                rated_id=rated_id,
                rating=rating_value,
                comment=comment
            )
            db.session.add(new_rating)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Valoraciones registradas correctamente'
    }), 200

@result_bp.route('/matches/<int:match_id>/photos', methods=['POST'])
@token_required
def upload_photo(current_user, match_id):
    # Obtener partido
    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({'message': 'Partido no encontrado'}), 404
    
    # Verificar que el partido está completado
    if match.status != 'completed':
        return jsonify({'message': 'Este partido no está completado'}), 400
    
    # Verificar si el usuario está participando
    participation = MatchParticipation.query.filter_by(
        match_id=match.id,
        user_id=current_user.id
    ).first()
    
    if not participation:
        return jsonify({'message': 'No estás participando en este partido'}), 403
    
    # Verificar si se ha enviado un archivo
    if 'photo' not in request.files:
        return jsonify({'message': 'No se ha enviado ninguna foto'}), 400
    
    file = request.files['photo']
    
    # Verificar si el archivo tiene nombre
    if file.filename == '':
        return jsonify({'message': 'No se ha seleccionado ningún archivo'}), 400
    
    # Verificar si el archivo es una imagen permitida
    if file and allowed_file(file.filename):
        # Crear directorio si no existe
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Generar nombre de archivo seguro
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        unique_filename = f"{match_id}_{current_user.id}_{timestamp}_{filename}"
        
        # Guardar archivo
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Guardar referencia en la base de datos
        relative_path = os.path.join('uploads', 'match_photos', unique_filename)
        
        new_photo = MatchPhoto(
            match_id=match.id,
            user_id=current_user.id,
            file_path=relative_path
        )
        
        db.session.add(new_photo)
        db.session.commit()
        
        return jsonify({
            'message': 'Foto subida correctamente',
            'photo_url': relative_path
        }), 201
    
    return jsonify({'message': 'Tipo de archivo no permitido'}), 400

@result_bp.route('/matches/<int:match_id>/photos', methods=['GET'])
@token_required
def get_match_photos(current_user, match_id):
    # Obtener partido
    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({'message': 'Partido no encontrado'}), 404
    
    # Verificar que el usuario es miembro de la liga
    from src.models.league import LeagueMembership
    membership = LeagueMembership.query.filter_by(
        user_id=current_user.id,
        league_id=match.league_id
    ).first()
    
    if not membership:
        return jsonify({'message': 'No tienes acceso a este partido'}), 403
    
    # Obtener fotos del partido
    photos = MatchPhoto.query.filter_by(match_id=match.id).all()
    photos_data = []
    
    for photo in photos:
        from src.models.user import User
        user = User.query.get(photo.user_id)
        
        photos_data.append({
            'id': photo.id,
            'file_path': photo.file_path,
            'uploaded_at': photo.uploaded_at.isoformat() if photo.uploaded_at else None,
            'user': {
                'id': user.id,
                'username': user.username
            } if user else None
        })
    
    return jsonify({'photos': photos_data}), 200

@result_bp.route('/users/<int:user_id>/stats', methods=['GET'])
@token_required
def get_user_stats(current_user, user_id):
    # Verificar si el usuario existe
    from src.models.user import User
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404
    
    # Obtener participaciones del usuario
    participations = MatchParticipation.query.filter_by(user_id=user_id).all()
    
    # Estadísticas generales
    total_matches = len(participations)
    matches_won = 0
    
    # Estadísticas por pareja
    partners = {}
    
    # Cartas usadas
    from src.models.card import CardAssignment, Card
    card_usage = {}
    
    for participation in participations:
        match = Match.query.get(participation.match_id)
        
        # Contar victorias
        if match and match.status == 'completed' and match.winner_team == participation.team:
            matches_won += 1
        
        # Contar partidos por pareja
        if match and match.status == 'completed':
            # Encontrar compañero de equipo
            partner = MatchParticipation.query.filter(
                MatchParticipation.match_id == match.id,
                MatchParticipation.team == participation.team,
                MatchParticipation.user_id != user_id
            ).first()
            
            if partner:
                partner_user = User.query.get(partner.user_id)
                
                if partner_user:
                    partner_id = partner_user.id
                    partner_name = partner_user.username
                    
                    if partner_id not in partners:
                        partners[partner_id] = {
                            'user_id': partner_id,
                            'username': partner_name,
                            'matches_played': 0,
                            'matches_won': 0
                        }
                    
                    partners[partner_id]['matches_played'] += 1
                    
                    if match.winner_team == participation.team:
                        partners[partner_id]['matches_won'] += 1
        
        # Contar uso de cartas
        card_assignment = CardAssignment.query.filter_by(participation_id=participation.id).first()
        
        if card_assignment and card_assignment.used:
            card = Card.query.get(card_assignment.card_id)
            
            if card:
                if card.name not in card_usage:
                    card_usage[card.name] = 0
                
                card_usage[card.name] += 1
    
    # Obtener valoraciones recibidas
    ratings_received = PlayerRating.query.filter_by(rated_id=user_id).all()
    avg_rating = 0
    
    if ratings_received:
        total_rating = sum(r.rating for r in ratings_received)
        avg_rating = total_rating / len(ratings_received)
    
    # Convertir partners a lista
    partners_list = list(partners.values())
    
    # Ordenar partners por victorias
    partners_list.sort(key=lambda x: x['matches_won'], reverse=True)
    
    # Convertir card_usage a lista
    card_usage_list = [{'name': name, 'count': count} for name, count in card_usage.items()]
    
    # Ordenar card_usage por uso
    card_usage_list.sort(key=lambda x: x['count'], reverse=True)
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username
        },
        'stats': {
            'total_matches': total_matches,
            'matches_won': matches_won,
            'win_rate': (matches_won / total_matches) * 100 if total_matches > 0 else 0,
            'avg_rating': avg_rating
        },
        'partners': partners_list,
        'card_usage': card_usage_list
    }), 200
