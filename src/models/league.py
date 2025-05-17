from datetime import datetime
from src.models import db
import secrets

class League(db.Model):
    __tablename__ = 'leagues'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    invite_code = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relaciones
    created_by = db.relationship('User', foreign_keys=[created_by_id])
    memberships = db.relationship('LeagueMembership', back_populates='league', cascade='all, delete-orphan')
    matches = db.relationship('Match', back_populates='league', cascade='all, delete-orphan')
    
    @staticmethod
    def generate_invite_code():
        return secrets.token_urlsafe(10)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'invite_code': self.invite_code,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by_id': self.created_by_id
        }

class LeagueMembership(db.Model):
    __tablename__ = 'league_memberships'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    league_id = db.Column(db.Integer, db.ForeignKey('leagues.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    user = db.relationship('User', back_populates='league_memberships')
    league = db.relationship('League', back_populates='memberships')
    
    # Restricción única para evitar membresías duplicadas
    __table_args__ = (db.UniqueConstraint('user_id', 'league_id', name='unique_membership'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'league_id': self.league_id,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }
