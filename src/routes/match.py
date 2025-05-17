from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import random
from src.models import db
from src.models.match import Match, MatchParticipation
from src.models.card import Card, CardAssignment
from src.models.league import League, LeagueMembership
from src.routes.auth import token_required

match_bp = Blueprint('match', __name__)

@match_bp.route('/leagues/<int:league_id>/matches', methods=['POST'])
@token_required
def create_match(current_user, league_id):
    # Verificar que el usuario es miembro de la liga
    membership = LeagueMembership.query.filter_by(
        user_id=current_user.id,
        league_id=league_id
    ).first()
    
    if not membership:
        return jsonify({'message': 'No tienes acceso a esta liga'}), 403
    
    data = request.get_json()
    
    # Validar datos requeridos
    if not data or not data.get('date'):
        return jsonify({'message': 'Fecha del partido requerida'}), 400
    
    try:
        match_date = datetime.fromisoformat(data['date'])
    except ValueError:
        return jsonify({'message': 'Formato de fecha inválido. Utiliza ISO 8601 (YYYY-MM-DDTHH:MM:SS)'}), 400
    
    # Crear nuevo partido
    new_match = Match(
        league_id=league_id,
        date=match_date,
        status='open',
        created_by_id=current_user.id
    )
    
    db.session.add(new_match)
    db.session.commit()
    
    return jsonify({
        'message': 'Partido creado correctamente',
        'match': new_match.to_dict()
    }), 201

@match_bp.route('/leagues/<int:league_id>/matches', methods=['GET'])
@token_required
def get_league_matches(current_user, league_id):
    # Verificar que el usuario es miembro de la liga
    membership = LeagueMembership.query.filter_by(
        user_id=current_user.id,
        league_id=league_id
    ).first()
    
    if not membership:
        return jsonify({'message': 'No tienes acceso a esta liga'}), 403
    
    # Obtener todos los partidos de la liga
    matches = Match.query.filter_by(league_id=league_id).order_by(Match.date.desc()).all()
    matches_data = []
    
    for match in matches:
        match_data = match.to_dict()
        
        # Obtener participantes
        participations = MatchParticipation.query.filter_by(match_id=match.id).all()
        participants = []
        
        for p in participations:
            from src.models.user import User
            user = User.query.get(p.user_id)
            if user:
                participants.append({
                    'user_id': user.id,
                    'username': user.username,
                    'team': p.team
                })
        
        match_data['participants'] = participants
        matches_data.append(match_data)
    
    return jsonify({'matches': matches_data}), 200

@match_bp.route('/matches/<int:match_id>', methods=['GET'])
@token_required
def get_match(current_user, match_id):
    # Obtener partido
    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({'message': 'Partido no encontrado'}), 404
    
    # Verificar que el usuario es miembro de la liga
    membership = LeagueMembership.query.filter_by(
        user_id=current_user.id,
        league_id=match.league_id
    ).first()
    
    if not membership:
        return jsonify({'message': 'No tienes acceso a este partido'}), 403
    
    match_data = match.to_dict()
    
    # Obtener participantes
    participations = MatchParticipation.query.filter_by(match_id=match.id).all()
    participants = []
    
    for p in participations:
        from src.models.user import User
        user = User.query.get(p.user_id)
        if user:
            participants.append({
                'user_id': user.id,
                'username': user.username,
                'team': p.team
            })
    
    match_data['participants'] = participants
    
    # Verificar si el usuario está participando
    user_participation = MatchParticipation.query.filter_by(
        match_id=match.id,
        user_id=current_user.id
    ).first()
    
    match_data['is_participating'] = user_participation is not None
    
    # Verificar si el partido está a punto de comenzar (1 hora antes)
    can_view_card = False
    card_data = None
    
    if user_participation and match.date <= datetime.utcnow() + timedelta(hours=1):
        can_view_card = True
        
        # Obtener asignación de carta
        card_assignment = CardAssignment.query.filter_by(
            participation_id=user_participation.id
        ).first()
        
        if card_assignment:
            card = Card.query.get(card_assignment.card_id)
            if card:
                card_data = {
                    'id': card.id,
                    'name': card.name,
                    'description': card.description,
                    'used': card_assignment.used
                }
    
    match_data['can_view_card'] = can_view_card
    match_data['card'] = card_data
    
    return jsonify({'match': match_data}), 200

@match_bp.route('/matches/<int:match_id>/join', methods=['POST'])
@token_required
def join_match(current_user, match_id):
    # Obtener partido
    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({'message': 'Partido no encontrado'}), 404
    
    # Verificar que el usuario es miembro de la liga
    membership = LeagueMembership.query.filter_by(
        user_id=current_user.id,
        league_id=match.league_id
    ).first()
    
    if not membership:
        return jsonify({'message': 'No tienes acceso a este partido'}), 403
    
    # Verificar que el partido está abierto
    if match.status != 'open':
        return jsonify({'message': 'Este partido ya no está abierto para inscripciones'}), 400
    
    # Verificar que el partido no ha comenzado
    if match.date <= datetime.utcnow():
        return jsonify({'message': 'Este partido ya ha comenzado'}), 400
    
    # Verificar si el usuario ya está participando
    existing_participation = MatchParticipation.query.filter_by(
        match_id=match.id,
        user_id=current_user.id
    ).first()
    
    if existing_participation:
        return jsonify({'message': 'Ya estás inscrito en este partido'}), 409
    
    data = request.get_json()
    team = data.get('team') if data and data.get('team') in [1, 2] else None
    
    # Si no se especifica equipo, asignar automáticamente
    if team is None:
        # Contar participantes en cada equipo
        team1_count = MatchParticipation.query.filter_by(match_id=match.id, team=1).count()
        team2_count = MatchParticipation.query.filter_by(match_id=match.id, team=2).count()
        
        # Asignar al equipo con menos jugadores
        if team1_count <= team2_count:
            team = 1
        else:
            team = 2
    
    # Verificar que el equipo no está completo (máximo 2 jugadores por equipo)
    team_count = MatchParticipation.query.filter_by(match_id=match.id, team=team).count()
    if team_count >= 2:
        return jsonify({'message': f'El equipo {team} ya está completo'}), 400
    
    # Crear participación
    participation = MatchParticipation(
        match_id=match.id,
        user_id=current_user.id,
        team=team
    )
    
    db.session.add(participation)
    db.session.commit()
    
    # Verificar si el partido está completo (4 jugadores)
    total_participants = MatchParticipation.query.filter_by(match_id=match.id).count()
    if total_participants == 4:
        # Asignar cartas aleatorias a cada participante
        assign_random_cards(match.id)
        
        # Actualizar estado del partido
        match.status = 'in_progress'
        db.session.commit()
    
    return jsonify({
        'message': 'Te has unido al partido correctamente',
        'team': team
    }), 200

@match_bp.route('/matches/<int:match_id>/leave', methods=['POST'])
@token_required
def leave_match(current_user, match_id):
    # Obtener partido
    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({'message': 'Partido no encontrado'}), 404
    
    # Verificar que el partido está abierto
    if match.status != 'open':
        return jsonify({'message': 'No puedes abandonar un partido que ya ha comenzado'}), 400
    
    # Verificar que el partido no ha comenzado
    if match.date <= datetime.utcnow():
        return jsonify({'message': 'No puedes abandonar un partido que ya ha comenzado'}), 400
    
    # Verificar si el usuario está participando
    participation = MatchParticipation.query.filter_by(
        match_id=match.id,
        user_id=current_user.id
    ).first()
    
    if not participation:
        return jsonify({'message': 'No estás inscrito en este partido'}), 404
    
    # Eliminar participación
    db.session.delete(participation)
    db.session.commit()
    
    return jsonify({
        'message': 'Has abandonado el partido correctamente'
    }), 200

@match_bp.route('/matches/<int:match_id>/use-card', methods=['POST'])
@token_required
def use_card(current_user, match_id):
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
    
    # Obtener asignación de carta
    card_assignment = CardAssignment.query.filter_by(
        participation_id=participation.id
    ).first()
    
    if not card_assignment:
        return jsonify({'message': 'No tienes una carta asignada para este partido'}), 404
    
    # Verificar si la carta ya fue usada
    if card_assignment.used:
        return jsonify({'message': 'Ya has usado tu carta en este partido'}), 400
    
    # Marcar carta como usada
    card_assignment.used = True
    card_assignment.used_at = datetime.utcnow()
    db.session.commit()
    
    # Obtener información de la carta
    card = Card.query.get(card_assignment.card_id)
    
    return jsonify({
        'message': 'Has usado tu carta correctamente',
        'card': {
            'id': card.id,
            'name': card.name,
            'description': card.description
        }
    }), 200

def assign_random_cards(match_id):
    # Obtener participantes del partido
    participations = MatchParticipation.query.filter_by(match_id=match_id).all()
    
    # Obtener todas las cartas activas
    active_cards = Card.query.filter_by(is_active=True).all()
    
    if not active_cards:
        return
    
    # Asignar una carta aleatoria a cada participante
    for participation in participations:
        # Seleccionar carta aleatoria
        random_card = random.choice(active_cards)
        
        # Crear asignación de carta
        card_assignment = CardAssignment(
            match_id=match_id,
            participation_id=participation.id,
            card_id=random_card.id
        )
        
        db.session.add(card_assignment)
    
    db.session.commit()
