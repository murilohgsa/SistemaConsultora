import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_ADMIN = os.getenv("DB_ADMIN")
DB_NOME = os.getenv("DB_NOME", "postgres")
DB_USUARIO = os.getenv("DB_USUARIO", "postgres")
DB_SENHA = os.getenv("DB_SENHA")
DB_PORT = os.getenv("DB_PORT", "5432")

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS usuario(
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    is_consultora BOOLEAN DEFAUT FALSE,
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
            admin = DB_ADMIN,
            banco = DB_NOME,
            usuario = DB_USUARIO,
            senha = DB_SENHA,
            port = DB_PORT
        )
        cursor = conexao.cursor()
        cursor.execute(CREATE_TABLES_SQL)
        conexao.commit()

    except Exception as error:
        print(f"erro ao criar tabelas: {error}")

    finally:
        if 'conexao' in locals() and connection:
            cursor.close()
            conexao.close()
if __name__ == "__main__":
    estruturando_banco()
