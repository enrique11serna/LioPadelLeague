from datetime import datetime
from src.models import db
from src.models.user import User
from src.models.match import Match

class League(db.Model):
    __tablename__ = 'leagues'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    invite_code = db.Column(db.String(50), unique=True, nullable=False)
    is_private = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    memberships = db.relationship(
        'LeagueMembership', back_populates='league', cascade='all, delete-orphan'
    )
    matches = db.relationship(
        'Match', back_populates='league', cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'invite_code': self.invite_code,
            'is_private': self.is_private,
            'created_at': self.created_at.isoformat() if self.created_at else None,
+           'members': [mem.user_id for mem in self.memberships],
+           'match_count': len(self.matches)
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
