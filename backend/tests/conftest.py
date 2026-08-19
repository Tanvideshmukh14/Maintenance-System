"""Runs the suite against the real MySQL database configured in .env
(alembic migrations must already be applied). Each test runs inside an
outer transaction that's rolled back afterward, so nothing written by
the tests is left behind in the dev database.
"""
import pytest
from sqlalchemy.orm import sessionmaker

from app.database import engine


@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()
