import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Configurações do Supabase ausentes no arquivo .env!")

# Inicializa o cliente do Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS usuario(
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    is_consultora BOOLEAN DEFAULT FALSE,
    foto_perfil TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--Calça, vestido, cardigam, blusa, sapato...
CREATE TABLE IF NOT EXISTS categoria (
    id_categoria SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pecas(
    id_peca SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_categoria INT REFERENCES categoria(id_categoria) ON DELETE SET NULL,
    titulo VARCHAR(100), --look 1, look 2...
    estacao VARCHAR(50), --primavera, inverno
    ocasiao VARCHAR(50), --festa, trabalho,
    imagem TEXT,
    observacoes TEXT,
    is_favorito BOOLEAN DEFAULT FALSE,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

"""

def estruturando_banco():
    if not DB_SENHA or not DB_ADMIN:
        raise ValueError("")

    try:
        conexao = psycopg2.connect(
            host = DB_ADMIN,
            database = DB_NOME,
            user = DB_USUARIO,
            password = DB_SENHA,
            port = DB_PORT
        )
        cursor = conexao.cursor()
        cursor.execute(CREATE_TABLES_SQL)
        conexao.commit()

    except Exception as error:
        print(f"erro ao criar tabelas: {error}")

    finally:
        if 'conexao' in locals() and conexao:
            cursor.close()
            conexao.close()
if __name__ == "__main__":
    estruturando_banco()
