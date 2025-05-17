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
    created_by = db.relationship('User', foreign_keys=[created_by_id])
    participations = db.relationship('MatchParticipation', back_populates='match', cascade='all, delete-orphan')
    card_assignments = db.relationship('CardAssignment', back_populates='match', cascade='all, delete-orphan')
    ratings = db.relationship('PlayerRating', back_populates='match', cascade='all, delete-orphan')
    photos = db.relationship('MatchPhoto', back_populates='match', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'league_id': self.league_id,
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
            'winner_team': self.winner_team,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by_id': self.created_by_id
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
    card_assignment = db.relationship('CardAssignment', back_populates='participation', uselist=False, cascade='all, delete-orphan')
    
    # Restricción única para evitar participaciones duplicadas
    __table_args__ = (db.UniqueConstraint('match_id', 'user_id', name='unique_participation'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'user_id': self.user_id,
            'team': self.team,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }
