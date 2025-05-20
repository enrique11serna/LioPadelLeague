from flask import Blueprint, jsonify, request
from src.models.user import User, db

user_bp = Blueprint('user', __name__)

@user_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/users', methods=['POST'])
def create_user():
    
    data = request.json
    user = User(username=data['username'], email=data['email'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@user_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204

@user_bp.route('/users/<int:user_id>/stats', methods=['GET'])
def get_user_stats(user_id):
    from src.models.match import MatchParticipation
    from src.models.rating import PlayerRating
    from sqlalchemy import func

    total_matches = MatchParticipation.query.filter_by(user_id=user_id).count()
    matches_won = MatchParticipation.query.filter_by(user_id=user_id, result='win').count()
    win_rate = (matches_won / total_matches * 100) if total_matches else 0

    avg_rating = db.session.query(func.avg(PlayerRating.rating)).filter_by(rated_id=user_id).scalar() or 0.0

    return jsonify({
        "total_matches": total_matches,
        "matches_won": matches_won,
        "win_rate": round(win_rate, 2),
        "avg_rating": round(avg_rating, 1)
    }), 200

