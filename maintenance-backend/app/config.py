from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Central app configuration. Values are read from environment variables
    or a local .env file (see .env.example).
    """

    database_url: str = "mysql+pymysql://root:password@localhost:3306/maintenance_db"
    secret_key: str = "change-this-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
