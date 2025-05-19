from flask import Blueprint, request, jsonify
from src.models import db
from src.models.league import League, LeagueMembership
from src.routes.auth import token_required

league_bp = Blueprint('league', __name__)

@league_bp.route('/', methods=['POST'])
@token_required
def create_league(current_user):
    data = request.get_json()
    
    # Validar datos requeridos
    if not data or not data.get('name'):
        return jsonify({'message': 'Nombre de liga requerido'}), 400
    
    # Generar código de invitación único
    invite_code = League.generate_invite_code()
    
    # Crear nueva liga
    new_league = League(
        name=data['name'],
        invite_code=invite_code,
        created_by_id=current_user.id
    )
    
    try:
        db.session.add(new_league)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al crear la liga: {str(e)}'}), 500

    
    # Añadir al creador como miembro de la liga
    membership = LeagueMembership(
        user_id=current_user.id,
        league_id=new_league.id
    )
    
    db.session.add(membership)
    db.session.commit()
    
    return jsonify({
        'message': 'Liga creada correctamente',
        'league': new_league.to_dict(),
        'invite_link': f"/join/{invite_code}"
    }), 201

@league_bp.route('/', methods=['GET'])
@token_required
def get_user_leagues(current_user):
    # Obtener todas las ligas del usuario a través de sus membresías
    memberships = LeagueMembership.query.filter_by(user_id=current_user.id).all()
    leagues = []
    
    for membership in memberships:
        league = League.query.get(membership.league_id)
        if league:
            league_data = league.to_dict()
            league_data['joined_at'] = membership.joined_at.isoformat() if membership.joined_at else None
            leagues.append(league_data)
    
    return jsonify({'leagues': leagues}), 200

@league_bp.route('/<int:league_id>', methods=['GET'])
@token_required
def get_league(current_user, league_id):
    # Verificar que el usuario es miembro de la liga
    membership = LeagueMembership.query.filter_by(
        user_id=current_user.id,
        league_id=league_id
    ).first()
    
    if not membership:
        return jsonify({'message': 'No tienes acceso a esta liga'}), 403
    
    league = League.query.get(league_id)
    if not league:
        return jsonify({'message': 'Liga no encontrada'}), 404
    
    # Obtener todos los miembros de la liga
    memberships = LeagueMembership.query.filter_by(league_id=league_id).all()
    members = []
    
    for m in memberships:
        from src.models.user import User
        user = User.query.get(m.user_id)
        if user:
            members.append({
                'user_id': user.id,
                'username': user.username,
                'joined_at': m.joined_at.isoformat() if m.joined_at else None
            })
    
    league_data = league.to_dict()
    league_data['members'] = members
    
    return jsonify({'league': league_data}), 200

@league_bp.route('/join/<string:invite_code>', methods=['POST'])
@token_required
def join_league(current_user, invite_code):
    # Buscar liga por código de invitación
    league = League.query.filter_by(invite_code=invite_code).first()
    
    if not league:
        return jsonify({'message': 'Código de invitación inválido'}), 404
    
    # Verificar si el usuario ya es miembro de la liga
    existing_membership = LeagueMembership.query.filter_by(
        user_id=current_user.id,
        league_id=league.id
    ).first()
    
    if existing_membership:
        return jsonify({'message': 'Ya eres miembro de esta liga'}), 409
    
    # Añadir al usuario como miembro de la liga
    membership = LeagueMembership(
        user_id=current_user.id,
        league_id=league.id
    )
    
    db.session.add(membership)
    db.session.commit()
    
    return jsonify({
        'message': 'Te has unido a la liga correctamente',
        'league': league.to_dict()
    }), 200

@league_bp.route('/<int:league_id>', methods=['PUT'])
@token_required
def update_league(current_user, league_id):
    # Verificar que el usuario es el creador de la liga
    league = League.query.get(league_id)
    
    if not league:
        return jsonify({'message': 'Liga no encontrada'}), 404
    
    if league.created_by_id != current_user.id:
        return jsonify({'message': 'No tienes permiso para modificar esta liga'}), 403
    
    data = request.get_json()
    
    # Actualizar nombre si está presente
    if data.get('name'):
        league.name = data['name']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Liga actualizada correctamente',
        'league': league.to_dict()
    }), 200

@league_bp.route('/<int:league_id>/regenerate-invite', methods=['POST'])
@token_required
def regenerate_invite(current_user, league_id):
    # Verificar que el usuario es el creador de la liga
    league = League.query.get(league_id)
    
    if not league:
        return jsonify({'message': 'Liga no encontrada'}), 404
    
    if league.created_by_id != current_user.id:
        return jsonify({'message': 'No tienes permiso para regenerar el código de invitación'}), 403
    
    # Generar nuevo código de invitación
    league.invite_code = League.generate_invite_code()
    db.session.commit()
    
    return jsonify({
        'message': 'Código de invitación regenerado correctamente',
        'league': league.to_dict(),
        'invite_link': f"/join/{league.invite_code}"
    }), 200
