const cinco_dias_ms = 5 * 24 * 60 * 60 * 1000
//rodar npm install --save-dev @types/node
import crypto from "node:crypto";
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
    nome:string;
    numero_telefone:string;
    numero_de_compras:number;
    numero_de_vendas:number;
    transacoes_cliente: transacao[];
    transacoes_vendedor: transacao[];
    
    constructor(
        nome:string, 
        numero_telefone:string 
    )
        
    {
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