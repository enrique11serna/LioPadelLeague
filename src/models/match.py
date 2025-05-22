from datetime import datetime
from src.models import db

class Match(db.Model):
    __tablename__ = 'matches'

    id = db.Column(db.Integer, primary_key=True)
    league_id = db.Column(db.Integer, db.ForeignKey('leagues.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='open', nullable=False)  # open, in_progress, completed, cancelled
    winner_team = db.Column(db.Integer, nullable=True)  # 1 o 2, null si no hay resultado
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Relaciones
    league = db.relationship('League', back_populates='matches')
    created_by = db.relationship('User', backref='created_matches')
    participations = db.relationship(
        'MatchParticipation', back_populates='match', cascade='all, delete-orphan'
    )
    card_assignments = db.relationship(
        'CardAssignment', back_populates='match', cascade='all, delete-orphan'
    )
    ratings = db.relationship(
        'PlayerRating', back_populates='match', cascade='all, delete-orphan'
    )
    photos = db.relationship(
        'MatchPhoto', back_populates='match', cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'league_id': self.league_id,
            'date': self.date.isoformat(),
            'status': self.status,
            'winner_team': self.winner_team,
            'participants': [p.to_dict() for p in self.participations],
            'ratings': [r.to_dict() for r in self.ratings],
            'photos': [ph.to_dict() for ph in self.photos]
        }


class MatchParticipation(db.Model):
    __tablename__ = 'match_participations'

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    team = db.Column(db.Integer, nullable=False)  # 1 o 2
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones
    match = db.relationship('Match', back_populates='participations')
    user = db.relationship('User', back_populates='match_participations')
    card_assignment = db.relationship(
        'CardAssignment', back_populates='participation', uselist=False, cascade='all, delete-orphan'
    )

    __table_args__ = (
        db.UniqueConstraint('match_id', 'user_id', name='unique_participation'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'user_id': self.user_id,
            'team': self.team,
            'joined_at': self.joined_at.isoformat()
        }


class CardAssignment(db.Model):
    __tablename__ = 'card_assignments'

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    participation_id = db.Column(db.Integer, db.ForeignKey('match_participations.id'), nullable=False)
    card_id = db.Column(db.Integer, db.ForeignKey('cards.id'), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    used = db.Column(db.Boolean, default=False)
    used_at = db.Column(db.DateTime, nullable=True)

    # Relaciones
    match = db.relationship('Match', back_populates='card_assignments')
    participation = db.relationship('MatchParticipation', back_populates='card_assignment')
    card = db.relationship('Card', back_populates='assignments')

    __table_args__ = (
        db.UniqueConstraint('match_id', 'participation_id', name='unique_card_assignment'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'participation_id': self.participation_id,
            'card_id': self.card_id,
            'used': self.used,
            'assigned_at': self.assigned_at.isoformat(),
            'used_at': self.used_at.isoformat() if self.used_at else None
        }
