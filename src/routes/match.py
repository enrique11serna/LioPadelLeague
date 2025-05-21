import random
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from src.models import db
from src.models.match import Match, MatchParticipation
from src.models.card import Card, CardAssignment
from src.models.league import LeagueMembership
from src.routes.auth import token_required

match_bp = Blueprint('match', __name__)

@match_bp.route('/leagues/<int:league_id>/matches', methods=['POST'])
@token_required
def create_match(league_id):
    """Crear un nuevo partido 2v2 en una liga específica."""
    user = g.current_user
    data = request.get_json() or {}
    date_str = data.get('date')
    if not date_str:
        return jsonify({'success': False, 'message': 'Fecha obligatoria'}), 400

    # Verificar membresía
    membership = LeagueMembership.query.filter_by(
        league_id=league_id, user_id=user.id
    ).first()
    if not membership:
        return jsonify({'success': False, 'message': 'No perteneces a esta liga'}), 403

    try:
        match_date = datetime.fromisoformat(date_str)
    except ValueError:
        return jsonify({'success': False, 'message': 'Formato de fecha inválido'}), 400

    new_match = Match(
        league_id=league_id,
        date=match_date,
        status='open',
        created_by_id=user.id
    )
    db.session.add(new_match)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Partido creado correctamente',
        'data': new_match.to_dict()
    }), 201

@match_bp.route('/leagues/<int:league_id>/matches', methods=['GET'])
@token_required
def get_league_matches(league_id):
    """Listar todos los partidos de una liga ordenados por fecha descendente."""
    user = g.current_user
    membership = LeagueMembership.query.filter_by(
        league_id=league_id, user_id=user.id
    ).first()
    if not membership:
        return jsonify({'success': False, 'message': 'Acceso denegado a esta liga'}), 403

    matches = Match.query.filter_by(league_id=league_id).order_by(Match.date.desc()).all()
    return jsonify({
        'success': True,
        'data': [m.to_dict() for m in matches]
    }), 200

@match_bp.route('/matches/<int:match_id>', methods=['GET'])
@token_required
def get_match(match_id):
    """Obtener los detalles de un partido y estado de carta para el usuario."""
    user = g.current_user
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'success': False, 'message': 'Partido no encontrado'}), 404

    # Verificar membresía en la liga del partido
    membership = LeagueMembership.query.filter_by(
        league_id=match.league_id, user_id=user.id
    ).first()
    if not membership:
        return jsonify({'success': False, 'message': 'No perteneces a esta liga'}), 403

    match_data = match.to_dict()
    match_data['can_view_card'] = False
    match_data['card'] = None

    # Lógica de carta: disponible 1h antes
    now = datetime.utcnow()
    if now >= match.date - timedelta(hours=1) and now <= match.date + timedelta(hours=1):
        participation = MatchParticipation.query.filter_by(
            match_id=match_id, user_id=user.id
        ).first()
        if participation:
            assignment = CardAssignment.query.filter_by(
                participation_id=participation.id
            ).first()
            if assignment:
                match_data['can_view_card'] = True
                match_data['card'] = assignment.card.to_dict()

    return jsonify({'success': True, 'data': match_data}), 200

@match_bp.route('/matches/<int:match_id>', methods=['PUT'])
@token_required
def update_match(match_id):
    """Actualizar fecha o estado de un partido (solo creador)."""
    user = g.current_user
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'success': False, 'message': 'Partido no encontrado'}), 404
    if match.created_by_id != user.id:
        return jsonify({'success': False, 'message': 'Solo el creador puede editar'}), 403

    data = request.get_json() or {}
    date_str = data.get('date')
    status = data.get('status')
    if date_str:
        try:
            match.date = datetime.fromisoformat(date_str)
        except ValueError:
            return jsonify({'success': False, 'message': 'Fecha inválida'}), 400
    if status in ('open', 'in_progress', 'completed', 'cancelled'):
        match.status = status
    db.session.commit()

    return jsonify({'success': True, 'data': match.to_dict()}), 200

@match_bp.route('/matches/<int:match_id>', methods=['DELETE'])
@token_required
def delete_match(match_id):
    """Eliminar un partido (solo creador)."""
    user = g.current_user
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'success': False, 'message': 'Partido no encontrado'}), 404
    if match.created_by_id != user.id:
        return jsonify({'success': False, 'message': 'Solo el creador puede eliminar'}), 403

    db.session.delete(match)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Partido eliminado'}), 200

@match_bp.route('/matches/<int:match_id>/join', methods=['POST'])
@token_required
def join_match(match_id):
    """Apuntarse a un partido en un equipo automático o especificado."""
    user = g.current_user
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'success': False, 'message': 'Partido no encontrado'}), 404

    # Verificar membresía en liga
    membership = LeagueMembership.query.filter_by(
        league_id=match.league_id, user_id=user.id
    ).first()
    if not membership:
        return jsonify({'success': False, 'message': 'No perteneces a esta liga'}), 403

    # Evitar duplicados o partida cerrada
    if match.status != 'open':
        return jsonify({'success': False, 'message': 'No puedes unirte, partido cerrado'}), 400
    existing = MatchParticipation.query.filter_by(
        match_id=match_id, user_id=user.id
    ).first()
    if existing:
        return jsonify({'success': False, 'message': 'Ya estás inscrito'}), 409

    data = request.get_json() or {}
    team = data.get('team')
    if team not in (1, 2):
        count1 = MatchParticipation.query.filter_by(match_id=match_id, team=1).count()
        count2 = MatchParticipation.query.filter_by(match_id=match_id, team=2).count()
        team = 1 if count1 <= count2 else 2

    part = MatchParticipation(match_id=match_id, user_id=user.id, team=team)
    db.session.add(part)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Inscripción correcta', 'data': part.to_dict()}), 200

@match_bp.route('/matches/<int:match_id>/leave', methods=['POST'])
@token_required
def leave_match(match_id):
    """Abandonar un partido (solo en estado open)."""
    user = g.current_user
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'success': False, 'message': 'Partido no encontrado'}), 404
    if match.status != 'open' or match.date <= datetime.utcnow():
        return jsonify({'success': False, 'message': 'No puedes abandonar'}), 400

    participation = MatchParticipation.query.filter_by(match_id=match_id, user_id=user.id).first()
    if not participation:
        return jsonify({'success': False, 'message': 'No estás inscrito'}), 404

    db.session.delete(participation)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Has abandonado el partido'}), 200

@match_bp.route('/matches/<int:match_id>/assign-cards', methods=['POST'])
@token_required
def assign_random_cards(match_id):
    """Asignar carta aleatoria a todos los participantes de un partido."""
    user = g.current_user
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'success': False, 'message': 'Partido no encontrado'}), 404
    if match.created_by_id != user.id:
        return jsonify({'success': False, 'message': 'Solo el creador puede asignar cartas'}), 403

    participations = MatchParticipation.query.filter_by(match_id=match_id).all()
    active_cards = Card.query.filter_by(is_active=True).all()
    if not active_cards:
        return jsonify({'success': False, 'message': 'No hay cartas activas'}), 400

    for p in participations:
        existing = CardAssignment.query.filter_by(participation_id=p.id).first()
        if not existing:
            chosen = random.choice(active_cards)
            ca = CardAssignment(match_id=match_id, participation_id=p.id, card_id=chosen.id)
            db.session.add(ca)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Cartas asignadas'}), 200

@match_bp.route('/matches/<int:match_id>/card', methods=['GET'])
@token_required
def get_card(match_id):
    """Ver la carta asignada (disponible 1h antes del partido)."""
    user = g.current_user
    mp = MatchParticipation.query.filter_by(match_id=match_id, user_id=user.id).first()
    if not mp:
        return jsonify({'success': False, 'message': 'No estás en este partido'}), 403

    match = mp.match
    now = datetime.utcnow()
    if now < match.date - timedelta(hours=1):
        return jsonify({'success': False, 'message': 'Demasiado pronto para ver la carta'}), 403

    assignment = CardAssignment.query.filter_by(participation_id=mp.id).first()
    if not assignment:
        return jsonify({'success': False, 'message': 'No hay carta asignada'}), 404

    return jsonify({'success': True, 'data': assignment.card.to_dict()}), 200
