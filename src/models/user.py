from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from src.models import db
from src.models.match import MatchParticipation
from src.models.rating import PlayerRating  # <-- corregido


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    league_memberships = db.relationship(
        'LeagueMembership', back_populates='user', cascade='all, delete-orphan'
    )
    match_participations = db.relationship(
        'MatchParticipation', back_populates='user', cascade='all, delete-orphan'
    )
    ratings_given = db.relationship(
        'PlayerRating',
        back_populates='rater',
        foreign_keys='PlayerRating.rater_id',
        cascade='all, delete-orphan'
    )
    ratings_received = db.relationship(
        'PlayerRating',
        back_populates='rated',
        foreign_keys='PlayerRating.rated_id',
        cascade='all, delete-orphan'
    )
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'leagues': [lm.league_id for lm in self.league_memberships],
            'stats': {
                'total_matches': len(self.match_participations),
                'ratings_given': len(self.ratings_given),
                'ratings_received': len(self.ratings_received)
            }
        }
