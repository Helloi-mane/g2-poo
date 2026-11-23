import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  usuario,
  horario,
  mercado,
  comida
} from "./classes.ts";
import { VendedorService } from "./vendedorService.ts";

const rl = createInterface({ input, output });

// 1. Inicializa o estado em memória do mercado limpo
const estadoMercado: mercado = {
  usuarios: [],
  produtos: []
};

const service = new VendedorService(estadoMercado);

// Usuário logado atual (enquanto a tela de login do grupo não é integrada)
const vendedorLogado = new usuario("Vendedor", "00000000000", "1234");
estadoMercado.usuarios.push(vendedorLogado);

// ==========================================
// FUNÇÕES AUXILIARES DO MENU
// ==========================================

function listarMeusProdutos() {
  const meus = estadoMercado.produtos.filter(
    p => p.vendedor.id_user === vendedorLogado.id_user
  );
  console.log("\n--- SEUS PRODUTOS CADASTRADOS ---");
  if (meus.length === 0) {
    console.log("Nenhum produto cadastrado.");
    return [];
  }
  meus.forEach((p, idx) => {
    const status = p.pausado ? "[PAUSADO]" : "[ATIVO]";
    const tipoInfo = p instanceof comida ? ` | Tipo: ${p.tipo}` : "";
    console.log(
      `${idx + 1}. ${p.nome} ${status} - R$ ${p.preco.toFixed(2)} | Estoque: ${p.quantidade} | Horário: ${p.horario_inicio.horas}h às ${p.horario_final.horas}h | Local: ${p.ponto_venda}${tipoInfo}`
    );
  });
  return meus;
}

async function escolherProduto() {
  const meus = listarMeusProdutos();
  if (meus.length === 0) return null;
  const resp = await rl.question("\nDigite o número do produto (ou 0 para voltar): ");
  const indice = Number(resp) - 1;
  if (indice < 0 || indice >= meus.length) return null;
  return meus[indice];
}

function listarReservas() {
  const reservas = service.listarReservasRecebidas(vendedorLogado);
  console.log("\n--- RESERVAS RECEBIDAS ---");
  if (reservas.length === 0) {
    console.log("Nenhuma reserva pendente ou em andamento.");
    return [];
  }
  reservas.forEach((t, idx) => {
    const status = t.confirmacao_vendedor ? "Aceita (Aguardando Retirada)" : "Pendente de Aprovação";
    console.log(
      `${idx + 1}. Produto: ${t.produto.nome} (${t.quantidade}x) | Comprador: ${t.comprador.nome} | Local: ${t.produto.ponto_venda} | Status: ${status}`
    );
  });
  return reservas;
}

async function escolherReserva() {
  const reservas = listarReservas();
  if (reservas.length === 0) return null;
  const resp = await rl.question("\nDigite o número da reserva (ou 0 para voltar): ");
  const indice = Number(resp) - 1;
  if (indice < 0 || indice >= reservas.length) return null;
  return reservas[indice];
}

// ==========================================
// LOOP PRINCIPAL DO MENU DO VENDEDOR
// ==========================================

async function menuPrincipal() {
  let rodando = true;

  while (rodando) {
    console.log("\n==========================================");
    console.log("   MARKETPLACE UNIVERSITÁRIO - VENDEDOR   ");
    console.log("==========================================");
    console.log("1. Cadastrar novo produto");
    console.log("2. Listar meus produtos");
    console.log("3. Editar produto");
    console.log("4. Pausar / Reativar produto");
    console.log("5. Remover produto");
    console.log("6. Controlar estoque");
    console.log("7. Definir / Alterar ponto de venda");
    console.log("8. Ver reservas recebidas");
    console.log("9. Aceitar reserva");
    console.log("10. Recusar / Cancelar reserva");
    console.log("11. Marcar reserva como retirada");
    console.log("0. Sair");

    const opcao = await rl.question("\nEscolha uma opção: ");

    switch (opcao.trim()) {
      case "1": {
        const nome = await rl.question("Nome do produto: ");
        const preco = Number(await rl.question("Preço (ex: 12.50): "));
        const qtd = Number(await rl.question("Quantidade em estoque: "));
        const hIni = Number(await rl.question("Hora início disponibilidade (0-23): "));
        const hFim = Number(await rl.question("Hora fim disponibilidade (0-23): "));
        const ehComida = (await rl.question("É comida? (s/n): ")).toLowerCase() === "s";
        const tipo = ehComida ? await rl.question("Tipo de comida (ex: Doce, Salgado): ") : undefined;
        const local = await rl.question("Ponto de venda no campus: ");

        const novo = vendedorLogado.criar_produto(
          nome,
          preco,
          qtd,
          new horario(hIni, 0),
          new horario(hFim, 0),
          tipo
        );
        service.definirPontoVenda(vendedorLogado, novo, local);
        estadoMercado.produtos.push(novo);
        console.log(`✅ Produto "${novo.nome}" cadastrado com sucesso!`);
        break;
      }

      case "2": {
        listarMeusProdutos();
        break;
      }

      case "3": {
        const prod = await escolherProduto();
        if (!prod) break;
        const novoNome = await rl.question(`Novo nome (${prod.nome}): `);
        const novoPrecoStr = await rl.question(`Novo preço (${prod.preco}): `);
        const novoTipo = prod instanceof comida
          ? await rl.question(`Novo tipo (${prod.tipo}): `)
          : undefined;

        service.editarProduto(vendedorLogado, prod, {
          nome: novoNome.trim() || undefined,
          preco: novoPrecoStr.trim() ? Number(novoPrecoStr) : undefined,
          tipo: novoTipo?.trim() || undefined
        });
        console.log("✅ Produto atualizado!");
        break;
      }

      case "4": {
        const prod = await escolherProduto();
        if (!prod) break;
        service.alternarPausa(vendedorLogado, prod);
        console.log(`✅ Produto agora está ${prod.pausado ? "PAUSADO" : "ATIVO"}!`);
        break;
      }

      case "5": {
        const prod = await escolherProduto();
        if (!prod) break;
        const ok = service.removerProduto(vendedorLogado, prod);
        console.log(ok ? "✅ Produto removido!" : "❌ Não foi possível remover.");
        break;
      }

      case "6": {
        const prod = await escolherProduto();
        if (!prod) break;
        const novaQtd = Number(await rl.question(`Nova quantidade em estoque (atual: ${prod.quantidade}): `));
        const ok = service.atualizarEstoque(vendedorLogado, prod, novaQtd);
        console.log(ok ? "✅ Estoque atualizado!" : "❌ Quantidade inválida.");
        break;
      }

      case "7": {
        const prod = await escolherProduto();
        if (!prod) break;
        const local = await rl.question(`Novo ponto de venda no campus (atual: ${prod.ponto_venda}): `);
        const ok = service.definirPontoVenda(vendedorLogado, prod, local);
        console.log(ok ? "✅ Ponto de venda atualizado!" : "❌ Local inválido.");
        break;
      }

      case "8": {
        listarReservas();
        break;
      }

      case "9": {
        const res = await escolherReserva();
        if (!res) break;
        service.aceitarReserva(vendedorLogado, res);
        console.log("✅ Reserva aceita! Combine a retirada com o comprador.");
        break;
      }

      case "10": {
        const res = await escolherReserva();
        if (!res) break;
        service.recusarOuCancelarReserva(vendedorLogado, res);
        console.log("✅ Reserva recusada/cancelada e estoque devolvido!");
        break;
      }

      case "11": {
        const res = await escolherReserva();
        if (!res) break;
        service.marcarComoRetirada(vendedorLogado, res);
        console.log(`✅ Produto entregue! Total de vendas realizadas: ${vendedorLogado.numero_de_vendas}`);
        break;
      }

      case "0": {
        rodando = false;
        console.log("Saindo do sistema...");
        break;
      }

      default:
        console.log("⚠️ Opção inválida.");
    }
  }

  rl.close();
}

await menuPrincipal();