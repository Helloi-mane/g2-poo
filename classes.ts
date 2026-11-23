const cinco_dias_ms = 5 * 24 * 60 * 60 * 1000
//rodar npm install --save-dev @types/node
import { DatabaseSync } from "node:sqlite";

import { setTimeout } from "node:timers";

import crypto from "node:crypto";

import {
  existsSync,
  readFileSync,
  writeFileSync
} from "node:fs";

import {
  createInterface
} from "node:readline/promises";

import {
  stdin as input,
  stdout as output
} from "node:process";

//Interfaces

interface horariodata{
    horas:number;
    minutos:number;
}

interface usuariodata{
    id_user:string;
    nome:string;
    senha:string;
    numero_telefone:string;
    numero_de_compras:number;
    numero_de_vendas:number;
    id_transacoes_cliente: string[];
    id_transacoes_vendedor: string[];
}

interface produtodata{
    id_produto:string;
    nome:string;
    preco:number;
    vendedor:string;
    quantidade:number;
    horario_inicio:horariodata;
    horario_final:horariodata;
    tipo_produto:string;
    tipo?:string;
}

interface transacaodata{
    id_transaction:string;
    id_vendedor:string;
    id_comprador:string;
    quantidade:number;
    id_produto:string;
    confirmacao_comprador:boolean;
    confirmacao_vendedor:boolean;
    expira_em:number;
}

interface MercadoData{
    usuarios:usuariodata[];
    produtos:produtodata[];
    transacoes:transacaodata[];
}

interface mercado{
    usuarios: usuario[];
    produtos: produto[];
}

//Repositórios
class jsonUsuarioRepositorio{
    constructor(private readonly arquivo:string){}
    existe(): boolean{
        return existsSync(this.arquivo)
    }

    salvar(m : mercado){
        const dados:usuariodata[] = m.usuarios.map(u =>({
            id_user:u.id_user,
            nome:u.nome,
            senha:u.senha,
            numero_telefone:u.numero_telefone,
            numero_de_compras:u.numero_de_compras,
            numero_de_vendas:u.numero_de_vendas,
            id_transacoes_cliente: u.transacoes_cliente.map(x =>x.id_transaction),
            id_transacoes_vendedor: u.transacoes_vendedor.map(x => x.id_transaction)

        }));
        writeFileSync(this.arquivo,JSON.stringify(dados,null,2),"utf-8")
    }

    carregar():usuariodata[]{//retorna os dados do arquivo sem ter criado os usuarios ou coisas do tipo
        if(!this.existe()) return [];
        return JSON.parse(readFileSync(this.arquivo,"utf-8"));
    }
}

class jsonProdutosRepositorio{
    constructor(private readonly arquivo:string){}
    existe(): boolean{
        return existsSync(this.arquivo)
    }

    salvar(m : mercado){
        const dados:produtodata[] = m.produtos.map((u):produtodata =>{//cada chamada retorna um produtodata novo para dados
                const base = {
                id_produto:u.id_produto,
                nome:u.nome,
                preco:u.preco,
                vendedor:u.vendedor.id_user,
                quantidade:u.quantidade,
                horario_inicio:{
                    horas:u.horario_inicio.horas,
                    minutos:u.horario_inicio.minutos
                },
                horario_final:{
                    horas:u.horario_final.horas,
                    minutos:u.horario_final.minutos
                }
            };
        return u instanceof comida//se u for comida, retorna os dados de base, o tipo_produto = comida e o tipo dele
        ?{...base,
            tipo_produto:"comida",
            tipo:u.tipo
        }//se u não for comida, retorna os dados da base e tipo_produto = geral
        : {... base,
            tipo_produto:"geral"
        };
        });
        
        writeFileSync(this.arquivo,JSON.stringify(dados,null,2),"utf-8")
    }

    carregar():produtodata[]{//retorna os dados do arquivo sem ter criado os usuarios ou coisas do tipo
        if(!this.existe()) return [];
        return JSON.parse(readFileSync(this.arquivo,"utf-8"));
    }
}

class jsonTransacaoRepositorio{
    constructor(private readonly arquivo:string){}
    existe(): boolean{
        return existsSync(this.arquivo)
    }

    salvar(m : mercado){
        const transacoes = m.usuarios.flatMap(u =>u.transacoes_vendedor)//transacoes tão dentro dos usuarios
        //flatMap junta todas os elementos de todas as listas em uma única lista
        //Com isso, ele junta todas as transações em uma única lista
        
        const dados:transacaodata[] = transacoes.map( x => ({
            id_transaction : x.id_transaction,
            id_vendedor : x.vendedor.id_user,
            id_comprador : x.comprador.id_user,
            quantidade : x.quantidade,
            id_produto : x.produto.id_produto,
            confirmacao_comprador : x.confirmacao_comprador,
            confirmacao_vendedor : x.confirmacao_vendedor,
            expira_em : x.expira_em
        }));
        
        writeFileSync(this.arquivo,JSON.stringify(dados,null,2),"utf-8")
    }

    carregar():transacaodata[]{
        if(!this.existe()) return [];
        return JSON.parse(readFileSync(this.arquivo,"utf-8"));
    }
}
//SQLite
class sqliteBanco{
    readonly db:DatabaseSync;//referencia a base de dadoss como db
    constructor(arquivo:string){
        this.db = new DatabaseSync(arquivo);//passa o caminho para um arquivo e nele os dados serão guardados. Caso ele não exiosta,ele será criado
        /*new sqliteBanco("dados.db");              // arquivo na pasta atual
        new sqliteBanco("./data/dados.db");       // em uma subpasta (a pasta precisa existir)
        new sqliteBanco("/home/user/dados.db");   // caminho absoluto*/
        this.criar_tabelas();
    }
    private criar_tabelas():void{
        this.db.exec('CREATE TABLE IF NOT EXISTS usuarios( id_user TEXT PRIMARY KEY, nome TEXT NOT NULL, senha TEXT NOT NULL, numero_telefone TEXT NOT NULL, numero_de_compras INTEGER NOT NULL, numero_de_vendas INTEGER NOT NULL);'
        //cria tabela de usuários com todas as colunas
        )
        this.db.exec('CREATE TABLE IF NOT EXISTS produtos(id_produto TEXT PRIMARY KEY, nome TEXT NOT NULL, preco REAL NOT NULL, vendedor TEXT NOT NULL, quantidade INTEGER NOT NULL, inicio_horas INTEGER NOT NULL, inicio_minutos INTEGER NOT NULL, final_horas INTEGER NOT NULL, final_minutos INTEGER NOT NULL, tipo_produto TEXT NOT NULL, tipo TEXT, FOREIGN KEY(vendedor) REFERENCES usuarios(id_user))');
        this.db.exec('CREATE TABLE IF NOT EXISTS transacoes(id_transaction TEXT PRIMARY KEY, id_vendedor TEXT NOT NULL, id_comprador TEXT NOT NULL, quantidade INTEGER NOT NULL, id_produto TEXT NOT NULL, confirmacao_comprador INTEGER NOT NULL, confirmacao_vendedor INTEGER NOT NULL, expira_em INTEGER NOT NULL, FOREIGN KEY (id_vendedor) REFERENCES usuarios(id_user), FOREIGN KEY (id_comprador) REFERENCES usuarios(id_user), FOREIGN KEY (id_produto) REFERENCES produtos(id_produto))');
    }
}

class sqliteUsuarioRepositorio{
    constructor(private readonly banco:sqliteBanco){}//recebe o banco
    salvar(m:mercado){
        this.banco.db.exec('BEGIN');
        try{
            this.banco.db.exec('DELETE FROM usuarios');//apaga todos os dados da tabela usuarios para evitar repetições
            const inserir = this.banco.db.prepare('INSERT INTO usuarios(id_user, nome, senha, numero_telefone, numero_de_compras, numero_de_vendas) VALUES(:id_user, :nome, :senha,:numero_telefone,:numero_de_compras,:numero_de_vendas)');
            for(const u of m.usuarios){
                inserir.run({
                    id_user:u.id_user,
                    nome:u.nome,
                    senha:u.senha,
                    numero_telefone:u.numero_telefone,
                    numero_de_compras:u.numero_de_compras,
                    numero_de_vendas:u.numero_de_vendas
                });
            }this.banco.db.exec('COMMIT');
        } catch(e){//se deu algum erro em apagar a tabela, volta pq deu ruim. Pode ser que transacoes tenha algum dado que esteja conectado com usuarios
            this.banco.db.exec('ROLLBACK');
            throw e;
        }
    }
    carregar():usuariodata[]{
        const linhas = this.banco.db.prepare('SELECT * FROM usuarios order by rowid').all() as unknown as Array<{
            //as unknown apaga o tipo original que o linhas receberia e o as Array indfica que o linhas receberá um array cujos elementos serão os seguintes
            id_user:string;
            nome:string;
            senha:string;
            numero_telefone:string;
            numero_de_compras:number;
            numero_de_vendas:number;
        }>;
        const transacoes = this.banco.db.prepare('SELECT id_transaction, id_vendedor, id_comprador FROM transacoes').all() as unknown as Array<{
            id_transaction:string;
            id_vendedor:string;
            id_comprador:string;
        }>;
        return linhas.map(linha => ({
            ...linha,//recebe tudo de linhas que já tem
            id_transacoes_cliente:transacoes.filter(t => t.id_comprador === linha.id_user).map(t => t.id_transaction),
            //id_transacoes_ciente vai lá, pega todas as transacoes e filtra pegando aquelas que apresentam o mesmo id entre o comprador e o usuaruo sendo analisado
            //se for igual, então, teremos um vetor com todas as transações do cliente linha e então o id_transacoes_clientes vai receber po id de todas elas
            id_transacoes_vendedor:transacoes.filter(t => t.id_vendedor === linha.id_user).map(t => t.id_transaction)
        }))
    }
}

class sqliteProdutosRepositorio{
    constructor(private readonly banco:sqliteBanco){};
    salvar(m:mercado){
        this.banco.db.exec('DELETE FROM produtos');
        const inserir = this.banco.db.prepare('INSERT INTO produtos(id_produto, nome, preco, vendedor, quantidade, inicio_horas,inicio_minutos, final_horas, final_minutos, tipo_produto, tipo) VALUES (:id_produto, :nome, :preco, :vendedor,:quantidade, :inicio_horas, :inicio_minutos, :final_horas, :final_minutos, :tipo_produto, :tipo)');
        for(const u of m.produtos){
            inserir.run({
                id_produto:u.id_produto,
                nome:u.nome,
                preco:u.preco,
                vendedor:u.vendedor.id_user,
                quantidade:u.quantidade,
                inicio_horas:u.horario_inicio.horas,
                inicio_minutos:u.horario_inicio.minutos,
                final_horas:u.horario_final.horas,
                final_minutos:u.horario_final.minutos,
                tipo_produto:u instanceof comida?"comida": "geral", //se u for de classe comida, tipo_produto recebe "comida". Se não, recebe "geral"
                tipo: u instanceof comida? u.tipo:null//se u for da classe comida, ent o tipo recebe u.tipo 
            });
        }
    }

    carregar():produtodata[]{
        const linhas = this.banco.db.prepare('SELECT * FROM produtos ORDER BY rowid').all() as unknown as Array<{//linhas pegará todas as linhas do banco e retornará como um array com todos os dados
            id_produto: string;
            nome:string;
            preco:number;
            vendedor:string;
            quantidade:number;
            inicio_horas:number;
            inicio_minutos:number;
            final_horas:number;
            final_minutos:number;
            tipo_produto:string;
            tipo:string | null;//pode ser string ou null
        }>;
        return linhas.map(l=>({
            id_produto:l.id_produto,
            nome:l.nome,
            preco:l.preco,
            vendedor:l.vendedor,
            quantidade:l.quantidade,
            horario_inicio:{horas:l.inicio_horas,minutos: l.inicio_minutos},
            horario_final:{horas:l.final_horas,minutos:l.final_minutos},
            tipo_produto: l.tipo_produto,
            tipo:l.tipo ?? undefined//se n tiver tipo ent é undefined
        }))
    }
}

class sqliteTransacaoRepositorio{
    constructor(private readonly banco:sqliteBanco){};
    salvar(m:mercado){
        this.banco.db.exec("DELETE FROM transacoes");
        const transacoes = m.usuarios.flatMap(u=>u.transacoes_vendedor);//usando todos os usuarios, olhamos para todas as transacoes de vendedores.
        //isso lista todas as transacoes existentes
        const inserir = this.banco.db.prepare("INSERT INTO transacoes(id_transaction, id_vendedor, id_comprador, quantidade, id_produto, confirmacao_comprador, confirmacao_vendedor, expira_em) VALUES(:id_transaction,:id_vendedor,:id_comprador,:quantidade,:id_produto,:confirmacao_comprador,:confirmacao_vendedor,:expira_em)");
        for(const u of transacoes){
            inserir.run({
                id_transaction:u.id_transaction,
                id_vendedor:u.vendedor.id_user,
                id_comprador:u.comprador.id_user,
                quantidade:u.quantidade,
                id_produto:u.produto.id_produto,
                confirmacao_comprador:u.confirmacao_comprador ? 1:0,//como em sql n existe booleano vamos converter pára números
                //? se verdadeiro : se falso
                confirmacao_vendedor:u.confirmacao_vendedor?1:0,
                expira_em:u.expira_em
            });
        }
    }

    carregar():transacaodata[]{
        const linhas = this.banco.db.prepare("SELECT * FROM transacoes ORDER BY rowid").all() as unknown as Array<{
            id_transaction:string;
            id_vendedor:string;
            id_comprador:string;
            quantidade:number;
            id_produto:string;
            confirmacao_comprador:number;
            confirmacao_vendedor:number;
            expira_em:number;
        }>;
        return linhas.map(l=>({
            ...l, confirmacao_comprador: l.confirmacao_comprador !==0,//o !==0 faz ele voltar a ser true pu false. Se for igual a 0 ent é false e se for diferente, true
            confirmacao_vendedor:l.confirmacao_vendedor !==0
        }));
    }
}

//classes

class horario{
    horas:number;
    minutos:number;
    constructor(horas:number, minutos:number){
        this.horas = horas;
        this.minutos = minutos;
    };
}

interface produto{
    id_produto:string;
    nome:string;
    preco:number;
    vendedor:usuario;
    quantidade:number;
    horario_inicio:horario;
    horario_final:horario;
}

class geral implements produto{
    id_produto:string;
    nome:string;
    preco:number;
    vendedor:usuario;
    quantidade:number;
    horario_inicio:horario;
    horario_final:horario;

    constructor(
    nome:string,
    preco:number,
    vendedor:usuario,
    quantidade:number,
    horario_inicio:horario,
    horario_final:horario)
    
    {
        this.id_produto = crypto.randomUUID();
        this.nome = nome;
        this.preco = preco;
        this.vendedor = vendedor;
        this.quantidade = quantidade;
        this.horario_inicio = horario_inicio;
        this.horario_final = horario_final;
    }
}
class comida implements produto{
    id_produto: string;
    nome:string;
    preco:number;
    vendedor:usuario;
    quantidade:number;
    horario_inicio:horario;
    horario_final:horario;
    tipo:string;
    constructor(
        nome:string,
        preco:number, 
        vendedor:usuario,
        quantidade:number,
        horarioinicio:horario,
        horariofinal:horario,
        tipo:string
    )
    {
        this.id_produto = crypto.randomUUID();
        this.nome = nome;
        this.preco = preco;
        this.vendedor = vendedor;
        this.quantidade = quantidade;
        this.horario_inicio = horarioinicio;
        this.horario_final = horariofinal;
        this.tipo = tipo;
    };
}

class transacao{
    private timer?: NodeJS.Timeout;//tipo do setTimeout
    id_transaction:string;
    vendedor:usuario;
    comprador:usuario;
    quantidade:number;
    produto:produto;
    confirmacao_comprador:boolean;
    confirmacao_vendedor:boolean;
    expira_em:number;
    constructor(
        vendedor:usuario,
        comprador:usuario,
        quantidade:number, 
        produto:produto,
        private onExpirar:(transacao:transacao)=>void//descrever tipo de função usa => ao invés de :
    )//usar private faz a função onExpirar ser criada
    {   
        this.timer = setTimeout(() => this.onExpirar(this),cinco_dias_ms);//o () faz ele espe-
        //rar 5 dias para então executar o onExpirar(this), que faz a propria tran-
        //sacao sumir

        //onExpirar é o nome da variável que guarda a funçãp do tipo void que será passada
        this.timer.unref?.();//não impede o Node de encerrar
        //não deixa o timer segurar o programa

        this.expira_em = Date.now() + cinco_dias_ms;
        this.id_transaction = crypto.randomUUID();
        this.vendedor = vendedor;
        this.comprador = comprador;
        this.produto = produto;
        this.quantidade = quantidade;
        this.confirmacao_comprador = false;
        this.confirmacao_vendedor = false;
    };
    cancelar_timer():void{
        if(this.timer) clearTimeout(this.timer);//cancela o timer
        this.timer = undefined;
    }
}

class usuario{
    id_user:string;
    senha:string;
    nome:string;
    numero_telefone:string;
    numero_de_compras:number;
    numero_de_vendas:number;
    transacoes_cliente: transacao[];
    transacoes_vendedor: transacao[];
    
    constructor(
        nome:string, 
        numero_telefone:string, 
        senha:string
    )
        
    {
        this.senha = senha;
        this.id_user = crypto.randomUUID();
        this.nome = nome;
        this.numero_telefone = numero_telefone;
        this.numero_de_compras = 0;
        this.numero_de_vendas = 0;
        this.transacoes_cliente = [];
        this.transacoes_vendedor = [];
    };

    criar_transacao(vendedor : usuario , comprador : usuario, quantidade : number, produto:produto) : transacao{
        const nova = new transacao(vendedor, comprador, quantidade, produto,
            (expirada) => {
                if(this.remover_transacao(expirada)){
                    expirada.produto.quantidade += expirada.quantidade;
                    console.log("Transação expirada e removida:", expirada.id_transaction);
                }
            }
        );
        return nova;
    }
    
    remover_transacao(t:transacao):boolean{
        const i = t.vendedor.transacoes_vendedor.findIndex(i=>i.id_transaction === t.id_transaction);
        if(i!=-1) t.vendedor.transacoes_vendedor.splice(i,1);

        const j = t.comprador.transacoes_cliente.findIndex((j => j.id_transaction === t.id_transaction));
        if(j!=-1) t.comprador.transacoes_cliente.splice(j,1);
        return i!=-1 && j!=-1;
    }
    
    criar_produto(
        nome: string,
        preco: number,
        quantidade: number,
        horario_inicio: horario,
        horario_final: horario,
        tipo?: string
    ): produto {
        let novo: produto;
        if (tipo) {
            novo = new comida(nome, preco, this, quantidade, horario_inicio, horario_final, tipo);
        } else {
            novo = new geral(nome, preco, this, quantidade, horario_inicio, horario_final);
        }

        return novo;
    }

    cancelar_reserva(t:transacao){
        this.remover_transacao(t);
        t.cancelar_timer();
        t.produto.quantidade += t.quantidade;
    }

    reserva(item : produto, quantidade : number) : void{
        if (item.quantidade - quantidade < 0 || quantidade <= 0) return;
        const nova = this.criar_transacao(item.vendedor , this, quantidade, item);
        item.quantidade -= quantidade;
        this.transacoes_cliente.push(nova);
        item.vendedor.transacoes_vendedor.push(nova);
    }

    finalizando_compra(t:transacao):void{
        if(!(t.confirmacao_comprador && t.confirmacao_vendedor)) return;//se algum deles não confirmou algo, retorna
        t.cancelar_timer();
        if(!this.remover_transacao(t)) return;//se essa transação não existia no treco deles, não faz mais nada
        t.comprador.numero_de_compras++;
        t.vendedor.numero_de_vendas++;
    }

    confirmar_compra(transacao:transacao):void{
        if(this.id_user != transacao.comprador.id_user) return;
        transacao.confirmacao_comprador = true;
        this.finalizando_compra(transacao);
    }
    
    confirmar_venda(transacao:transacao):void{
        if(this.id_user != transacao.vendedor.id_user) return;
        transacao.confirmacao_vendedor = true;
        this.finalizando_compra(transacao);
    }

}


function aoExpirar(t:transacao):void{
    if(t.comprador.remover_transacao(t)){
        t.produto.quantidade += t.quantidade;
        console.log("Transação expirada e removida:", t.id_transaction);
    }
}//função que quandpo expira a transacao, volta a quantidade ofertada e apaga a transacao da lista do comprador e do vendedor

function carregar_mercado(
    repo_usuarios:sqliteUsuarioRepositorio,
    repo_produtos:sqliteProdutosRepositorio,
    repo_transacoes:sqliteTransacaoRepositorio
    ):mercado{
    const usuarios = new Map<string, usuario>();//usuarios será um objto que contém uma string e um usuario
    for(const d of repo_usuarios.carregar()){
        const u = new usuario(d.nome, d.numero_telefone, d.senha);
        u.id_user = d.id_user;
        u.numero_de_compras = d.numero_de_compras;
        u.numero_de_vendas = d.numero_de_vendas;
        usuarios.set(u.id_user,u);//guarda no objeto usuario o id e o objeto usuário
    }
    
    const buscar_usuario = (id:string):usuario => {
        const u = usuarios.get(id);//u guarda o usuario com o id recebido
        if(!u) throw new Error(`Usuario ${id} não encontrado`)
        return u;
    }
    const produtos = new Map<string, produto>();
    for(const p of repo_produtos.carregar()){//vai criar um produto para todos os produtos do repositorio
        const vendedor = buscar_usuario(p.vendedor);
        const inicio = new horario(p.horario_inicio.horas, p.horario_inicio.minutos);
        const final = new horario(p.horario_final.horas, p.horario_final.minutos);
        const produto:produto = p.tipo_produto === "comida" ? new comida(p.nome, p.preco, vendedor, p.quantidade, inicio, final, p.tipo ?? "")
        //Se o produto for do tipo "comida", criamos ele como uma comida, que contém o tipo de comida se ela é doce ou slagada
        : new geral (p.nome, p.preco,vendedor,p.quantidade,inicio, final)
        //se não for uma comida, então, ele é do tipo geral
        produto.id_produto = p.id_produto;
        produtos.set(p.id_produto,produto);
        //cria um meio que array de objetos que contém tanto o id quando o próprio produto 
    }

    for (const a of repo_transacoes.carregar()){
        const vendedor = buscar_usuario(a.id_vendedor);
        const comprador = buscar_usuario(a.id_comprador);
        const prod = produtos.get(a.id_produto);
        if(!prod) throw new Error(`Produtor ${a.id_produto} não encontrado`);

        const novo = new transacao(vendedor, comprador, a.quantidade, prod, aoExpirar);
        novo.cancelar_timer()//evita que o timer da transacao criada comece
        novo.id_transaction = a.id_transaction;
        novo.expira_em = a.expira_em;
        novo.confirmacao_comprador = a.confirmacao_comprador;
        novo.confirmacao_vendedor = a.confirmacao_vendedor;

        const restante = Math.max(0,a.expira_em - Date.now());//calcula o tempo que resta até expirar
        setTimeout(() => aoExpirar(novo),restante).unref?.();//unref permite o program terminar mesmo com um timer

        comprador.transacoes_cliente.push(novo);
        vendedor.transacoes_vendedor.push(novo);
    }
    return {
        usuarios:[...usuarios.values()],
        produtos:[...produtos.values()]//retorna todos os usuarios e produtos criados dentro de mercado
    }
}

function salvar_mercado_sqlite(
    m:mercado,
    banco:sqliteBanco,
    repo_usuarios:sqliteUsuarioRepositorio,
    repo_produtos:sqliteProdutosRepositorio,
    repo_transacoes:sqliteTransacaoRepositorio
):void{
    banco.db.exec("BEGIN TRANSACTION");
    try{
        banco.db.exec("PRAGMA defer_foreign_keys = ON");//permite apagar uma tabela msm q ela tenha chaves estrangeiras. Assim, só dará erro se algo como algum produto sem vendedor existir
        repo_usuarios.salvar(m);
        repo_produtos.salvar(m);
        repo_transacoes.salvar(m);
        banco.db.exec("COMMIT");
    }catch(erro){
        banco.db.exec("ROLLBACK");
        throw erro;
    }
}
