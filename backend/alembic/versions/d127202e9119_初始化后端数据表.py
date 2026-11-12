"""初始化后端数据表

Revision ID: d127202e9119
Revises:
Create Date: 2026-11-12 23:45:10.667702
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd127202e9119'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('username', sa.String(length=64), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.Enum('STUDENT', 'TEACHER', 'ADMIN', name='user_role', create_constraint=True), nullable=False),
    sa.Column('status', sa.Enum('ACTIVE', 'DISABLED', name='user_status', create_constraint=True), nullable=False),
    sa.Column('auth_version', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('length(password_hash) > 0', name=op.f('ck_users_password_hash_nonempty')),
    sa.CheckConstraint('length(username) BETWEEN 3 AND 64', name=op.f('ck_users_username_length')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
    sa.UniqueConstraint('email', name=op.f('uq_users_email')),
    sa.UniqueConstraint('username', name=op.f('uq_users_username'))
    )
    op.create_table('courses',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('teacher_id', sa.Uuid(), nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('length(name) BETWEEN 1 AND 160', name=op.f('ck_courses_name_length')),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], name=op.f('fk_courses_teacher_id_users'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_courses')),
    sa.UniqueConstraint('code', name=op.f('uq_courses_code'))
    )
    op.create_index(op.f('ix_courses_teacher_id'), 'courses', ['teacher_id'], unique=False)
    op.create_table('class_sessions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('course_id', sa.Uuid(), nullable=False),
    sa.Column('class_name', sa.String(length=120), nullable=False),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.Enum('SCHEDULED', 'CANCELLED', name='session_status', create_constraint=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('length(class_name) BETWEEN 1 AND 120', name=op.f('ck_class_sessions_class_name_length')),
    sa.CheckConstraint('starts_at < ends_at', name=op.f('ck_class_sessions_valid_time_range')),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], name=op.f('fk_class_sessions_course_id_courses'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_class_sessions'))
    )
    op.create_index('ix_class_sessions_course_starts', 'class_sessions', ['course_id', 'starts_at'], unique=False)
    op.create_table('emoji_records',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('session_id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=True),
    sa.Column('emoji_type', sa.Enum('HAPPY', 'SAD', 'ANGRY', 'FEARFUL', 'SURPRISED', 'NEUTRAL', name='emoji_type', create_constraint=True), nullable=False),
    sa.Column('source', sa.Enum('MANUAL', 'AI', name='record_source', create_constraint=True), nullable=False),
    sa.Column('event_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('confidence', sa.Double(), nullable=True),
    sa.Column('event_id', sa.Uuid(), nullable=True),
    sa.Column('source_id', sa.String(length=120), nullable=True),
    sa.CheckConstraint("(source = 'MANUAL' AND user_id IS NOT NULL AND confidence IS NULL AND event_id IS NULL) OR (source = 'AI' AND user_id IS NULL AND confidence IS NOT NULL AND event_id IS NOT NULL)", name=op.f('ck_emoji_records_source_fields')),
    sa.CheckConstraint('confidence IS NULL OR (confidence >= 0 AND confidence <= 1)', name=op.f('ck_emoji_records_confidence_range')),
    sa.ForeignKeyConstraint(['session_id'], ['class_sessions.id'], name=op.f('fk_emoji_records_session_id_class_sessions'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_emoji_records_user_id_users'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_emoji_records')),
    sa.UniqueConstraint('event_id', name=op.f('uq_emoji_records_event_id'))
    )
    op.create_index('ix_emoji_records_session_event', 'emoji_records', ['session_id', 'event_at'], unique=False)
    op.create_index('ix_emoji_records_source_event', 'emoji_records', ['source', 'event_at'], unique=False)
    op.create_index('ix_emoji_records_user_event', 'emoji_records', ['user_id', 'event_at'], unique=False)
    op.create_table('schedule_users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('session_id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('assigned_by', sa.Uuid(), nullable=False),
    sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], name=op.f('fk_schedule_users_assigned_by_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['session_id'], ['class_sessions.id'], name=op.f('fk_schedule_users_session_id_class_sessions'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_schedule_users_user_id_users'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_schedule_users')),
    sa.UniqueConstraint('session_id', 'user_id', name='session_user')
    )
    op.create_index(op.f('ix_schedule_users_session_id'), 'schedule_users', ['session_id'], unique=False)
    op.create_index(op.f('ix_schedule_users_user_id'), 'schedule_users', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_schedule_users_user_id'), table_name='schedule_users')
    op.drop_index(op.f('ix_schedule_users_session_id'), table_name='schedule_users')
    op.drop_table('schedule_users')
    op.drop_index('ix_emoji_records_user_event', table_name='emoji_records')
    op.drop_index('ix_emoji_records_source_event', table_name='emoji_records')
    op.drop_index('ix_emoji_records_session_event', table_name='emoji_records')
    op.drop_table('emoji_records')
    op.drop_index('ix_class_sessions_course_starts', table_name='class_sessions')
    op.drop_table('class_sessions')
    op.drop_index(op.f('ix_courses_teacher_id'), table_name='courses')
    op.drop_table('courses')
    op.drop_table('users')
    for enum_name in ("record_source", "emoji_type", "session_status", "user_status", "user_role"):
        op.execute(sa.text(f"DROP TYPE IF EXISTS {enum_name}"))
