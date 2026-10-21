import os
from flask import Flask, request, redirect, url_for, render_template, flash, session, jsonify
from dotenv import load_dotenv
from supabase import create_client, Client
import cloudinary
import cloudinary.uploader

# --- 1. Configuração do Supabase ---
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Configure SUPABASE_URL e SUPABASE_KEY no arquivo .env")

if not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Configure SUPABASE_SERVICE_KEY no arquivo .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Configuração do Cloudinary

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# --- 2. Configuração do Flask ---
app = Flask(__name__)
app.secret_key = "chave_secreta_super_segura_aqui"  # Necessário para as mensagens flash e sessão

# Rota inicial redireciona para a tela de login
@app.route("/")
def index():
    return redirect(url_for("login"))

# Rota de Login (Repare que o nome é /login, igual ao action do seu form)
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        # Pega os dados do seu form HTML
        email = request.form.get("email", "").strip()
        senha = request.form.get("senha", "")

        if not email or not senha:
            flash("Informe email e senha.")
            return render_template("login.html"), 400

        
        try:
            # 1. Autentica no Supabase
            resposta_auth = supabase.auth.sign_in_with_password({
                "email": email, 
                "password": senha
            })
            usuario_id = resposta_auth.user.id

            resposta_banco = (supabase_admin.table("usuario")
                              .select("id_usuario, email, nome, is_consultora")
                              .eq("email", email)
                              .execute())

            if not resposta_banco.data:
                flash("Usuário não tem perfil configurado no banco.")
                return render_template("login.html"), 403

            dados_usuario = resposta_banco.data[0]
            is_consultora = dados_usuario.get("is_consultora", False)

            session["user_id"] = usuario_id
            session["is_consultora"] = is_consultora
            if is_consultora:
                return redirect(url_for("gerenciamento"))
            return redirect(url_for("feed"))
                
        except Exception as e:
            app.logger.exception("Falha ao autenticar usuário")
            mensagem = str(e).lower()
            if "email not confirmed" in mensagem:
                flash("Confirme seu email no Supabase antes de entrar.")
            else:
                flash("Email ou senha incorretos.")
            return render_template("login.html"), 401

    return render_template("login.html")


# --- 3. Telas após o Login ---

@app.route("/gerenciamento")
def gerenciamento():
    # Proteção: se não tiver logado, manda pro login de volta
    if "user_id" not in session:
        return redirect(url_for("login"))

    try:
        resposta = supabase_admin.table("usuario") \
            .select("id_usuario, nome, email, foto_perfil") \
            .eq("is_consultora", False) \
            .execute()
        clientes = resposta.data
    except Exception:
        clientes = []
    return render_template("gerenciamento.html", clientes=clientes)


@app.route("/feed") 
def feed():
    # Proteção: se não tiver logado, manda pro login de volta
    if "user_id" not in session:
        return redirect(url_for("login"))
    #pega a foto do cliente para o perfil ou pega uma aleatória
    try:
        perfil = supabase_admin.table("usuario").select("nome", "foto_perfil").eq("auth_user_id", session["user_id"]).single().execute()
        cliente = perfil.data
    except Exception:
        cliente = {"nome": "", "foto_perfil.jpg": None}

    return render_template("feed.html", cliente=cliente)

@app.route("/logout")
def logout():
    # Limpa a sessão e sai do Supabase
    session.pop("user_id", None)
    supabase.auth.sign_out()
    return redirect(url_for("login"))

@app.route("/perfil")
def perfil():
    # Proteção: se não tiver logado, manda pro login de volta
    if "user_id" not in session:
        return redirect(url_for("login"))
    try:
        resposta = supabase_admin.table("usuario").select("*").eq("auth_user_id", session["user_id"]).single().execute()
        cliente = resposta.data
    except Exception:
        cliente= None
    return render_template("perfil.html", cliente=cliente)


# cadastro do cliente

@app.route("/cadastrar", methods=["POST"])
def cadastrar():
    if "user_id" not in session:
        return redirect(url_for("login"))
    nome = request.form.get("nome", "").strip()
    email = request.form.get("email", "").strip()
    senha = request.form.get("senha", "")
    is_consultora = request.form.get("is_consultora") == "true"

    if not email or not senha or not nome:
        flash("Preencha todos os campos.")
        return redirect(url_for("gerenciamento"))

    try:
        resposta = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": senha,
            "email_confirm": True,
            "user_metadata": {"nome": nome}
        })

        usuario_id = resposta.user.id

        supabase_admin.table("usuario").insert({
            "auth_user_id":usuario_id,
            "email":email,
            "nome": nome,
            "is_consultora": is_consultora
        }).execute()

        flash("Cliente cadastrado com sucesso!", "cadastro")
    except Exception as e:
        app.logger.exception("Erro ao cadastrar cliente")
        flash("Erro ao cadastrar. Verifique os dados inseridos.", "cadastro_erro")

    return redirect(url_for("gerenciamento"))

@app.route("/excluir_cliente/<int:id_cliente>", methods=["POST"])

def excluir_cliente(id_cliente):
    if "user_id" not in session:
        return redirect(url_for("login")), 401

    try:
        resposta = supabase_admin.table("usuario") \
            .select("auth_user_id") \
            .eq("id_usuario", id_cliente) \
            .single() \
            .execute()

        auth_user_id = resposta.data["auth_user_id"]

        supabase_admin.table("usuario") \
            .delete() \
            .eq("id_usuario", id_cliente) \
            .execute()
        supabase_admin.auth.admin.delete_user(auth_user_id)
        return "", 200
    
    except Exception:
        app.logger.exception("Erro ao excluir cliente")
        return "", 500


@app.route("/pecas/<int:id_cliente>")
def pecas(id_cliente):
    if "user_id" not in session:
        return jsonify([]), 401

    try:
        # categoria(nome, parte_corpo) faz o "join" com a tabela categoria e já traz
        # a parte do corpo (1 cabeça, 2 tronco, 3 cintura, 4 pés, 5 acessório)
        resposta = supabase_admin.table("pecas").select("id_peca, titulo, imagem, estacao, ocasiao, is_favorito, categoria(nome, parte_corpo)").eq("id_cliente", id_cliente).execute()

        #formata os dados
        resultado = []
        for peca in resposta.data:
            categoria = peca.get("categoria") or {}
            resultado.append({
                "id_peca": peca["id_peca"],
                "titulo": peca["titulo"],
                "imagem": peca["imagem"],
                "estacao": peca["estacao"],
                "ocasiao": peca["ocasiao"],
                "is_favorito": peca["is_favorito"],
                "categoria_nome": categoria.get("nome") or "Sem categoria",
                # usado na aba de looks para filtrar as peças de cada bolinha da silhueta
                "parte_corpo": categoria.get("parte_corpo")
            })
        return jsonify(resultado), 200
    except Exception:
        app.logger.exception("Erro ao buscar pecas")
        return jsonify([]), 500

@app.route("/categorias")
def categorias():
    if "user_id" not in session:
        return jsonify([]), 401

    try:
        # parte_corpo diz em qual bolinha da silhueta as peças dessa categoria aparecem
        resposta = supabase_admin.table("categoria").select("id_categoria, nome, parte_corpo").order("nome").execute()
        return jsonify(resposta.data), 200
    except Exception:
        app.logger.exception("Erro ao buscar categorias")
        return jsonify([]), 500


# --- 4. Categorias de peça e partes do corpo ---
# Números das partes do corpo, iguais à tabela parte_corpo do banco
# e ao data-parte das bolinhas da silhueta no gerenciamento.html
PARTES_CORPO = {1: "Cabeça", 2: "Tronco", 3: "Cintura", 4: "Pés", 5: "Acessório"}

@app.route("/adicionar_categoria", methods=["POST"])
def adicionar_categoria():
    # Cadastra uma nova categoria de PEÇA (ex.: "Brinco") já ligada a uma parte do corpo.
    # Recebe JSON: {"nome": "Brinco", "parte_corpo": 5}
    # Devolve a categoria criada em JSON, para o JavaScript já colocar ela nos selects.
    if "user_id" not in session:
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    parte_corpo = dados.get("parte_corpo")

    # validações: nome obrigatório e parte do corpo precisa ser 1 a 5
    if not nome:
        return jsonify({"erro": "Informe o nome da categoria."}), 400
    try:
        parte_corpo = int(parte_corpo)
    except (TypeError, ValueError):
        parte_corpo = None
    if parte_corpo not in PARTES_CORPO:
        return jsonify({"erro": "Escolha a parte do corpo."}), 400

    try:
        resposta = supabase_admin.table("categoria").insert({
            "nome": nome,
            "parte_corpo": parte_corpo
        }).execute()
        return jsonify(resposta.data[0]), 201
    except Exception as e:
        app.logger.exception("Erro ao adicionar categoria")
        # o nome da categoria é UNIQUE no banco, então repetido cai aqui
        if "duplicate" in str(e).lower():
            return jsonify({"erro": "Essa categoria já existe."}), 409
        return jsonify({"erro": "Erro ao adicionar categoria."}), 500


# --- 5. Categorias de look (Inverno, Verão, Festa, Casamento...) ---

@app.route("/categorias_look")
def categorias_look():
    # Lista as categorias do LOOK inteiro (não confundir com categoria da peça)
    if "user_id" not in session:
        return jsonify([]), 401

    try:
        resposta = supabase_admin.table("categoria_look").select("id_categoria_look, nome").order("nome").execute()
        return jsonify(resposta.data), 200
    except Exception:
        app.logger.exception("Erro ao buscar categorias de look")
        return jsonify([]), 500

@app.route("/adicionar_categoria_look", methods=["POST"])
def adicionar_categoria_look():
    # Cadastra uma nova categoria de look. Recebe JSON: {"nome": "Formatura"}
    if "user_id" not in session:
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    if not nome:
        return jsonify({"erro": "Informe o nome da categoria."}), 400

    try:
        resposta = supabase_admin.table("categoria_look").insert({"nome": nome}).execute()
        return jsonify(resposta.data[0]), 201
    except Exception as e:
        app.logger.exception("Erro ao adicionar categoria de look")
        if "duplicate" in str(e).lower():
            return jsonify({"erro": "Essa categoria já existe."}), 409
        return jsonify({"erro": "Erro ao adicionar categoria."}), 500


# --- 6. Looks ---

def buscar_looks_do_cliente(id_cliente):
    # Busca todos os looks de um cliente, cada um com:
    #   - suas peças (imagem, título e parte do corpo, para montar o "boneco")
    #   - suas categorias de look (Inverno, Festa...)
    # Usada pela tela da consultora (/looks/<id>) e pela tela do cliente (/meus_looks).

    # O select aninhado faz os joins de uma vez só:
    #   looks -> look_pecas -> pecas -> categoria   (peças do look)
    #   looks -> look_categoria -> categoria_look  (categorias do look)
    resposta = supabase_admin.table("looks").select(
        "id_look, titulo, is_favorito, data, "
        "look_pecas(pecas(id_peca, titulo, imagem, categoria(nome, parte_corpo))), "
        "look_categoria(categoria_look(id_categoria_look, nome))"
    ).eq("id_cliente", id_cliente).order("data", desc=True).execute()

    # formata os dados em um JSON mais simples para o JavaScript
    resultado = []
    for look in resposta.data:
        pecas = []
        for ligacao in look.get("look_pecas") or []:
            peca = ligacao.get("pecas")
            if not peca:
                continue
            categoria = peca.get("categoria") or {}
            pecas.append({
                "id_peca": peca["id_peca"],
                "titulo": peca["titulo"],
                "imagem": peca["imagem"],
                "categoria_nome": categoria.get("nome") or "Sem categoria",
                "parte_corpo": categoria.get("parte_corpo")
            })

        categorias = [
            ligacao["categoria_look"]
            for ligacao in look.get("look_categoria") or []
            if ligacao.get("categoria_look")
        ]

        resultado.append({
            "id_look": look["id_look"],
            "titulo": look["titulo"],
            "is_favorito": look["is_favorito"],
            "data": look["data"],
            "pecas": pecas,
            "categorias": categorias
        })
    return resultado

@app.route("/looks/<int:id_cliente>")
def looks(id_cliente):
    # Tela da consultora: looks de qualquer cliente escolhido no menu lateral
    if "user_id" not in session:
        return jsonify([]), 401

    try:
        return jsonify(buscar_looks_do_cliente(id_cliente)), 200
    except Exception:
        app.logger.exception("Erro ao buscar looks")
        return jsonify([]), 500

@app.route("/meus_looks")
def meus_looks():
    # Tela do cliente (feed): só os looks do próprio usuário logado.
    # Não recebe id na URL de propósito, para um cliente não ver looks de outro.
    if "user_id" not in session:
        return jsonify([]), 401

    try:
        return jsonify(buscar_looks_do_cliente(id_usuario_logado())), 200
    except Exception:
        app.logger.exception("Erro ao buscar os looks do cliente")
        return jsonify([]), 500

@app.route("/favoritar_look/<int:id_look>", methods=["POST"])
def favoritar_look(id_look):
    # Liga/desliga a estrela de favorito do look.
    # Devolve o novo valor: {"is_favorito": true}
    if "user_id" not in session:
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        resposta = supabase_admin.table("looks").select("id_cliente, is_favorito") \
            .eq("id_look", id_look).single().execute()
        look = resposta.data

        # cliente só pode favoritar look dele; a consultora pode qualquer um
        if not session.get("is_consultora") and look["id_cliente"] != id_usuario_logado():
            return jsonify({"erro": "Não autorizado"}), 403

        novo_valor = not look["is_favorito"]
        supabase_admin.table("looks").update({"is_favorito": novo_valor}).eq("id_look", id_look).execute()
        return jsonify({"is_favorito": novo_valor}), 200
    except Exception:
        app.logger.exception("Erro ao favoritar look")
        return jsonify({"erro": "Erro ao favoritar o look."}), 500

@app.route("/salvar_look", methods=["POST"])
def salvar_look():
    # Salva um look novo. Recebe JSON:
    # {
    #   "id_cliente": 13,
    #   "titulo": "Look jantar",
    #   "pecas": [6, 10, 19],        -> id das peças escolhidas nas bolinhas
    #   "categorias": [2, 6]         -> id das categorias de look (Verão, Festa...)
    # }
    if "user_id" not in session:
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.get_json(silent=True) or {}
    id_cliente = dados.get("id_cliente")
    titulo = (dados.get("titulo") or "").strip()
    # set() tira ids repetidos, caso a mesma peça venha duas vezes
    ids_pecas = list({int(i) for i in dados.get("pecas") or []})
    ids_categorias = list({int(i) for i in dados.get("categorias") or []})

    if not id_cliente or not titulo:
        return jsonify({"erro": "Informe o nome do look."}), 400
    if not ids_pecas:
        return jsonify({"erro": "Adicione pelo menos uma peça ao look."}), 400

    try:
        # Segurança: confere se todas as peças são mesmo desse cliente,
        # para ninguém montar um look com peças de outra pessoa
        resposta_pecas = supabase_admin.table("pecas").select("id_peca") \
            .eq("id_cliente", id_cliente).in_("id_peca", ids_pecas).execute()
        if len(resposta_pecas.data) != len(ids_pecas):
            return jsonify({"erro": "Alguma peça não pertence a este cliente."}), 400

        # 1. cria o look e pega o id gerado
        resposta_look = supabase_admin.table("looks").insert({
            "id_cliente": int(id_cliente),
            "titulo": titulo,
            "is_favorito": False
        }).execute()
        id_look = resposta_look.data[0]["id_look"]

        try:
            # 2. liga as peças ao look (uma linha por peça em look_pecas)
            supabase_admin.table("look_pecas").insert([
                {"id_look": id_look, "id_peca": id_peca} for id_peca in ids_pecas
            ]).execute()

            # 3. liga as categorias ao look (uma linha por categoria em look_categoria)
            if ids_categorias:
                supabase_admin.table("look_categoria").insert([
                    {"id_look": id_look, "id_categoria_look": id_cat} for id_cat in ids_categorias
                ]).execute()
        except Exception:
            # se der erro nas ligações, apaga o look para não ficar um look "pela metade"
            supabase_admin.table("looks").delete().eq("id_look", id_look).execute()
            raise

        # 4. avisa o cliente que tem look novo (aparece no sininho das telas dele).
        # Fica num try separado: se a notificação falhar, o look continua salvo.
        try:
            supabase_admin.table("notificacao").insert({
                "id_usuario": int(id_cliente),
                "id_look": id_look,
                "mensagem": f'Sua consultora criou um novo look para você: "{titulo}"'
            }).execute()
        except Exception:
            app.logger.exception("Erro ao criar notificação do look")

        return jsonify({"id_look": id_look}), 201
    except Exception:
        app.logger.exception("Erro ao salvar look")
        return jsonify({"erro": "Erro ao salvar o look."}), 500

@app.route("/excluir_look/<int:id_look>", methods=["POST"])
def excluir_look(id_look):
    # Apaga o look. As linhas de look_pecas e look_categoria somem sozinhas
    # (ON DELETE CASCADE no banco). As PEÇAS continuam existindo.
    if "user_id" not in session:
        return "", 401

    try:
        supabase_admin.table("looks").delete().eq("id_look", id_look).execute()
        return "", 200
    except Exception:
        app.logger.exception("Erro ao excluir look")
        return "", 500


# --- 7. Notificações do cliente ---

def id_usuario_logado():
    # A sessão guarda o id do Supabase Auth (uuid). As tabelas usam o id_usuario
    # (número) da tabela usuario, então aqui fazemos a conversão.
    resposta = supabase_admin.table("usuario").select("id_usuario") \
        .eq("auth_user_id", session["user_id"]).single().execute()
    return resposta.data["id_usuario"]

@app.route("/notificacoes")
def notificacoes():
    # Lista as últimas 20 notificações do usuário logado, já com o look
    # (título, imagens das peças e categorias) para o JavaScript mostrar no sininho.
    # Devolve: {"nao_lidas": 2, "notificacoes": [...]}
    if "user_id" not in session:
        return jsonify({"nao_lidas": 0, "notificacoes": []}), 401

    try:
        resposta = supabase_admin.table("notificacao").select(
            "id_notificacao, mensagem, lida, data, "
            "looks(id_look, titulo, "
            "look_pecas(pecas(imagem, titulo, categoria(parte_corpo))), "
            "look_categoria(categoria_look(nome)))"
        ).eq("id_usuario", id_usuario_logado()).order("data", desc=True).limit(20).execute()

        resultado = []
        for notif in resposta.data:
            look = notif.get("looks") or {}
            # peças do look, na ordem do corpo (cabeça primeiro, acessórios por último)
            pecas = [ligacao["pecas"] for ligacao in look.get("look_pecas") or [] if ligacao.get("pecas")]
            pecas.sort(key=lambda p: (p.get("categoria") or {}).get("parte_corpo") or 9)
            resultado.append({
                "id_notificacao": notif["id_notificacao"],
                # usado para abrir o look no feed ao clicar na notificação
                "id_look": look.get("id_look"),
                "mensagem": notif["mensagem"],
                "lida": notif["lida"],
                "data": notif["data"],
                "titulo_look": look.get("titulo"),
                "imagens": [p["imagem"] for p in pecas if p.get("imagem")],
                "categorias": [
                    ligacao["categoria_look"]["nome"]
                    for ligacao in look.get("look_categoria") or []
                    if ligacao.get("categoria_look")
                ]
            })

        nao_lidas = sum(1 for n in resultado if not n["lida"])
        return jsonify({"nao_lidas": nao_lidas, "notificacoes": resultado}), 200
    except Exception:
        app.logger.exception("Erro ao buscar notificações")
        return jsonify({"nao_lidas": 0, "notificacoes": []}), 500

@app.route("/notificacoes/lidas", methods=["POST"])
def marcar_notificacoes_lidas():
    # Chamada quando o cliente abre o sininho: marca todas como lidas,
    # o que zera o número vermelho.
    if "user_id" not in session:
        return "", 401

    try:
        supabase_admin.table("notificacao").update({"lida": True}) \
            .eq("id_usuario", id_usuario_logado()).eq("lida", False).execute()
        return "", 200
    except Exception:
        app.logger.exception("Erro ao marcar notificações como lidas")
        return "", 500

@app.route("/adicionar_peca", methods=["POST"])
def adicionar_peca():
    if "user_id" not in session:
        return redirect(url_for("login"))
    is_consultora = session.get("is_consultora", False)
    destino = "gerenciamento" if is_consultora else "adicionarPecaCliente"

    id_cliente = request.form.get("id_cliente")
    titulo = request.form.get("titulo", "").strip()
    id_categoria = request.form.get("id_categoria")
    estacao = request.form.get("estacao")
    ocasiao = request.form.get("ocasiao")
    observacoes = request.form.get("observacoes", "").strip()
    imagem = request.files.get("imagem")

    if not all([id_cliente, titulo, id_categoria, estacao, ocasiao, imagem]):
        flash("Preencha todos os campos.", "erro")
        return redirect(url_for(destino))
    
    #fazer upload para o cloudinary
    try:
        resultado = cloudinary.uploader.upload(
            imagem, 
            folder="pecas",
            transformation=[{"width": 600, "crop": "limit"}]
        )
        url_imagem = resultado["secure_url"]

        #salva no banco

        supabase_admin.table("pecas").insert({
            "id_cliente": int(id_cliente),
            "titulo": titulo,
            "id_categoria": int(id_categoria),
            "estacao": estacao,
            "ocasiao": ocasiao,
            "observacoes": observacoes,
            "imagem": url_imagem,
            "is_favorito": False
        }).execute()

        flash("Peça adicionada com sucesso!", "sucesso")
    except Exception:
        app.logger.exception("Erro ao adicionar peça")
        flash("Erro ao adicionar peça", "erro")
    return redirect(url_for(destino))

@app.route("/excluir_peca/<int:id_peca>", methods=["POST"])
def excluir_peca(id_peca):
    if "user_id" not in session:
        return "", 401

    try:
        # busca a URL da imagem para deletar do Cloudinary
        resposta = supabase_admin.table("pecas") \
            .select("imagem") \
            .eq("id_peca", id_peca) \
            .single() \
            .execute()

        url_imagem = resposta.data.get("imagem")

        # exclui do banco
        supabase_admin.table("pecas") \
            .delete() \
            .eq("id_peca", id_peca) \
            .execute()

        # exclui do Cloudinary
        if url_imagem:
            public_id = "pecas/" + url_imagem.split("/")[-1].split(".")[0]
            cloudinary.uploader.destroy(public_id)

        return "", 200

    except Exception:
        app.logger.exception("Erro ao excluir peça")
        return "", 500

# cadastro de pecas do cliente

@app.route("/adicionar")
def adicionarPecaCliente():
    if "user_id" not in session:
        return redirect(url_for("login"))

    try:
        resp_categorias = supabase_admin.table("categoria").select("id_categoria, nome").execute()
        categorias = resp_categorias.data
        resp_usuario=supabase_admin.table("usuario").select("id_usuario").eq("auth_user_id", session["user_id"]).single().execute()
        id_cliente = resp_usuario.data["id_usuario"]
    except Exception:
        app.logger.exception("Erro ao carregar página de adicionar peça")
        categorias = []
        id_cliente = None

    return render_template("adicionarPeca.html", categorias=categorias, id_cliente=id_cliente)


if __name__ == "__main__":
    app.run(debug=True)