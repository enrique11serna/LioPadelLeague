from datetime import datetime
from src.models import db

class Card(db.Model):
    __tablename__ = 'cards'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relaciones
    assignments = db.relationship('CardAssignment', back_populates='card', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active
        }

class CardAssignment(db.Model):
    __tablename__ = 'card_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    participation_id = db.Column(db.Integer, db.ForeignKey('match_participations.id'), nullable=False)
    card_id = db.Column(db.Integer, db.ForeignKey('cards.id'), nullable=False)
    used = db.Column(db.Boolean, default=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    used_at = db.Column(db.DateTime, nullable=True)
    
    # Relaciones
    match = db.relationship('Match', back_populates='card_assignments')
    participation = db.relationship('MatchParticipation', back_populates='card_assignment')
    card = db.relationship('Card', back_populates='assignments')
    
    # Restricción única para evitar asignaciones duplicadas
    __table_args__ = (db.UniqueConstraint('match_id', 'participation_id', name='unique_card_assignment'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'participation_id': self.participation_id,
            'card_id': self.card_id,
            'used': self.used,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'used_at': self.used_at.isoformat() if self.used_at else None
        }
