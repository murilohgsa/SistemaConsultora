import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Configurações do Supabase ausentes no arquivo .env!")

# Inicializa o cliente do Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def testar_conexao_e_operacoes():
    try:
        # Exemplo: Inserir uma categoria de teste na tabela 'categoria'
        resposta = supabase.table("categoria").insert({"nome": "Vestido"}).execute()
        print("Dados inseridos com sucesso:", resposta.data)

        # Exemplo: Consultar as categorias existentes
        dados_categorias = supabase.table("categoria").select("*").execute()
        print("Categorias registradas:", dados_categorias.data)

    except Exception as error:
        print(f"Erro nas operações com Supabase: {error}")

if __name__ == "__main__":
    testar_conexao_e_operacoes()