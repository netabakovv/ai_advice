import yaml
from pathlib import Path

# Определяем путь к config.yaml относительно этого файла (config.py)
# Это гарантирует, что config.yaml ищется в той же папке, где лежит config.py
CONFIG_PATH = Path(__file__).parent / "config.yaml"

def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Конфигурационный файл не найден: {CONFIG_PATH.absolute()}\n"
            f"Пожалуйста, создайте config.yaml в папке: {CONFIG_PATH.parent.absolute()}"
        )
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

# Загружаем конфиг при импорте
config = load_config()