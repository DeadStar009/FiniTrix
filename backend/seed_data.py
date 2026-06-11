from app.database import init_db
from app.services.seed_data import seed_if_empty


if __name__ == "__main__":
    init_db()
    seed_if_empty()
    print("Seed complete")
