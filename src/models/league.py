from datetime import datetime
import uuid
from src.models import db
from src.models.user import User

class League(db.Model):
    __tablename__ = 'leagues'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    invite_code = db.Column(db.String(50), unique=True, nullable=False)
    is_private = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Relaciones
    created_by = db.relationship('User', backref='created_leagues')
    memberships = db.relationship(
        'LeagueMembership', back_populates='league', cascade='all, delete-orphan'
    )
    matches = db.relationship(
        'Match', back_populates='league', cascade='all, delete-orphan'
    )

    @staticmethod
    def generate_invite_code():
        """Genera un código único de 8 caracteres para invitar a nuevas personas a la liga."""
        return uuid.uuid4().hex[:8]

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'invite_code': self.invite_code,
            'is_private': self.is_private,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by_id,
            'members': [m.user_id for m in self.memberships],
            'match_count': len(self.matches)
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
