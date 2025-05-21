# src/routes/profile.py

from flask import Blueprint, jsonify, g
from src.routes.auth import token_required
from src.models.match import MatchParticipation, Match
from src.models.rating import PlayerRating
from src.models.card import CardAssignment

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/history', methods=['GET'])
@token_required
def get_history():
    user = g.current_user
    participations = MatchParticipation.query.filter_by(user_id=user.id).all()
    history = []
    for p in participations:
        match = p.match
        history.append({
            'match_id': match.id,
            'league_id': match.league_id,
            'date': match.date.isoformat(),
            'team': p.team,
            'your_result': 'win' if match.winner_team == p.team else 'loss',
            'status': match.status
        })
    return jsonify({'success': True, 'data': history}), 200

@profile_bp.route('/stats', methods=['GET'])
@token_required
def get_stats():
    user = g.current_user
    participations = MatchParticipation.query.filter_by(user_id=user.id).all()
    total_matches = len(participations)
    individual_wins = sum(1 for p in participations if p.match.winner_team == p.team)

    # Victories by pair
    pair_wins = {}
    for p in participations:
        if p.match.winner_team != p.team:
            continue
        teammates = [pp.user_id for pp in p.match.participations 
                     if pp.team == p.team and pp.user_id != user.id]
        if teammates:
            key = tuple(sorted([user.id] + teammates))
            pair_wins[key] = pair_wins.get(key, 0) + 1

    pair_stats = [{'pair': list(k), 'wins': v} for k, v in pair_wins.items()]

    # Cards used
    assignments = CardAssignment.query.join(MatchParticipation)\
        .filter(MatchParticipation.user_id == user.id).all()
    cards_used = {}
    for ca in assignments:
        cards_used[ca.card.name] = cards_used.get(ca.card.name, 0) + 1

    # Ratings received
    ratings = PlayerRating.query.filter_by(rated_id=user.id).all()
    total_ratings = len(ratings)
    avg_rating = (round(sum(r.rating for r in ratings) / total_ratings, 2)
                  if total_ratings else None)

    stats = {
        'total_matches': total_matches,
        'individual_wins': individual_wins,
        'pair_wins': pair_stats,
        'cards_used': cards_used,
        'total_ratings_received': total_ratings,
        'average_rating_received': avg_rating
    }
    return jsonify({'success': True, 'data': stats}), 200
