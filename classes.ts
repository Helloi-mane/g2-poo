const cinco_dias_ms = 5 * 24 * 60 * 60 * 1000
//rodar npm install --save-dev @types/node
import { DatabaseSync } from "node:sqlite";

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

//Classes

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
