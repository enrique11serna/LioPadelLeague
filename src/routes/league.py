import uuid
from flask import Blueprint, request, jsonify, g
from src.models import db
from src.models.league import League, LeagueMembership
from src.routes.auth import token_required

league_bp = Blueprint('league', __name__)

@league_bp.route('/', methods=['GET'])
@token_required
def list_leagues():
    """Listar todas las ligas en las que participa el usuario."""
    user = g.current_user
    leagues = [lm.league.to_dict() for lm in user.league_memberships]
    return jsonify({'success': True, 'data': leagues}), 200

@league_bp.route('/<int:league_id>', methods=['GET'])
@token_required
def get_league(league_id):
    """Obtener detalles de una liga específica, incluyendo partidos."""
    user = g.current_user
    membership = LeagueMembership.query.filter_by(league_id=league_id, user_id=user.id).first()
    if not membership:
        return jsonify({'success': False, 'message': 'No tienes acceso a esta liga'}), 403
    league = membership.league
    data = league.to_dict()
    # Añadir partidos en la respuesta
    data['matches'] = [m.to_dict() for m in league.matches]
    return jsonify({'success': True, 'data': data}), 200

@league_bp.route('/', methods=['POST'])
@token_required
def create_league():
    """Crear una nueva liga privada y generar enlace de invitación."""
    user = g.current_user
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Nombre de liga requerido'}), 400

    # Crear liga
    invite_code = League.generate_invite_code()
    league = League(name=name, invite_code=invite_code)
    league.created_by_id = user.id if hasattr(league, 'created_by_id') else None
    db.session.add(league)
    db.session.commit()

    # Unir al creador a la liga
    membership = LeagueMembership(user_id=user.id, league_id=league.id)
    db.session.add(membership)
    db.session.commit()

    invite_link = f"{request.host_url.rstrip('/api/') }/join/{invite_code}"
    return jsonify({
        'success': True,
        'data': {
            'league': league.to_dict(),
            'invite_link': invite_link
        }
    }), 201

@league_bp.route('/<int:league_id>', methods=['PUT'])
@token_required
def update_league(league_id):
    """Actualizar el nombre de la liga."""
    user = g.current_user
    league = League.query.get(league_id)
    if not league:
        return jsonify({'success': False, 'message': 'Liga no encontrada'}), 404
    if league.created_by_id != user.id:
        return jsonify({'success': False, 'message': 'No tienes permiso para editar esta liga'}), 403

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if name:
        league.name = name
        league.updated_at = League.updated_at.default.arg if hasattr(League, 'updated_at') else league.updated_at
        db.session.commit()

    return jsonify({'success': True, 'data': league.to_dict()}), 200

@league_bp.route('/<int:league_id>', methods=['DELETE'])
@token_required
def delete_league(league_id):
    """Eliminar una liga (solo si es creador)."""
    user = g.current_user
    league = League.query.get(league_id)
    if not league:
        return jsonify({'success': False, 'message': 'Liga no encontrada'}), 404
    if league.created_by_id != user.id:
        return jsonify({'success': False, 'message': 'No tienes permiso para eliminar esta liga'}), 403

    db.session.delete(league)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Liga eliminada'}), 200

@league_bp.route('/join/<string:invite_code>', methods=['POST'])
@token_required
def join_league(invite_code):
    """Unirse a una liga usando el código de invitación."""
    user = g.current_user
    league = League.query.filter_by(invite_code=invite_code).first()
    if not league:
        return jsonify({'success': False, 'message': 'Liga no encontrada'}), 404

    existing = LeagueMembership.query.filter_by(user_id=user.id, league_id=league.id).first()
    if existing:
        return jsonify({'success': False, 'message': 'Ya estás en esta liga'}), 409

    membership = LeagueMembership(user_id=user.id, league_id=league.id)
    db.session.add(membership)
    db.session.commit()
    return jsonify({'success': True, 'data': league.to_dict()}), 200

@league_bp.route('/<int:league_id>/regenerate-invite', methods=['POST'])
@token_required
def regenerate_invite(league_id):
    """Regenerar el código de invitación (solo creador)."""
    user = g.current_user
    league = League.query.get(league_id)
    if not league:
        return jsonify({'success': False, 'message': 'Liga no encontrada'}), 404
    if league.created_by_id != user.id:
        return jsonify({'success': False, 'message': 'No tienes permiso para regenerar el código'}), 403

    league.invite_code = League.generate_invite_code()
    db.session.commit()
    invite_link = f"{request.host_url.rstrip('/api/') }/join/{league.invite_code}"
    return jsonify({
        'success': True,
        'data': {
            'league': league.to_dict(),
            'invite_link': invite_link
        }
    }), 200
