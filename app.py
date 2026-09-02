from flask import Flask, render_template, request, redirect, url_for, flash
import backend.banco

app = Flask(__name__)
app.secret_key = 'chave_secreta_para_sessoes'

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    senha = request.form.get('senha')
    
    

if __name__ == '__main__':
    app.run(debug=True)