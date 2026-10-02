"""Initial schema migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='client'),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('organisation', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Episodes table
    op.create_table(
        'episodes',
        sa.Column('episode_id', sa.String(length=100), primary_key=True),
        sa.Column('robot_id', sa.String(length=100), nullable=False),
        sa.Column('task_name', sa.String(length=255), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=False),
        sa.Column('operator_name', sa.String(length=255), nullable=False),
        sa.Column('quality', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_episodes_robot_id', 'episodes', ['robot_id'])
    op.create_index('ix_episodes_task_name', 'episodes', ['task_name'])
    op.create_index('ix_episodes_recorded_at', 'episodes', ['recorded_at'])
    op.create_index('ix_episodes_quality', 'episodes', ['quality'])
    op.create_index('idx_episodes_robot_recorded', 'episodes', ['robot_id', 'recorded_at'])
    op.create_index('idx_episodes_quality_task', 'episodes', ['quality', 'task_name'])

    # Requests table
    op.create_table(
        'requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('task_name', sa.String(length=255), nullable=False),
        sa.Column('episodes_requested', sa.Integer(), nullable=False),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='submitted'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_requests_client_id', 'requests', ['client_id'])
    op.create_index('ix_requests_status', 'requests', ['status'])
    op.create_index('idx_requests_client_status', 'requests', ['client_id', 'status'])

    # StatusHistory table
    op.create_table(
        'status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_status', sa.String(length=50), nullable=True),
        sa.Column('to_status', sa.String(length=50), nullable=False),
        sa.Column('changed_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_status_history_request_id', 'status_history', ['request_id'])

    # Assignments table
    op.create_table(
        'assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('episode_id', sa.String(length=100), sa.ForeignKey('episodes.episode_id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('assigned_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('export_status', sa.String(length=50), nullable=False, server_default='pending')
    )
    op.create_index('ix_assignments_request_id', 'assignments', ['request_id'])

    # ExportJobs table
    op.create_table(
        'export_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assignment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )

def downgrade() -> None:
    op.drop_table('export_jobs')
    op.drop_table('assignments')
    op.drop_table('status_history')
    op.drop_table('requests')
    op.drop_table('episodes')
    op.drop_table('users')
