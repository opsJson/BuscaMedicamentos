const URL = "https://cbr3emmw65uv2uzbjcfknv4iny0nuiul.lambda-url.sa-east-1.on.aws";
let state, city;
let lastQuery;
let licenca;

loadConfig();

//fetch(`${URL}/refreshDistribuidoras`, {headers: {Authorization: licenca}}).then(r => r.json()).then(r => console.log(r));

M.FormSelect.init(document.querySelectorAll("select"));
M.Tabs.init(document.querySelectorAll(".tabs"));
M.Modal.init(document.querySelectorAll("#bula"), {inDuration: 0, outDuration: 0});
M.Modal.init(document.querySelectorAll("#config"), {inDuration: 0, outDuration: 0});
M.Collapsible.init(document.querySelectorAll(".collapsible"));

document.getElementById("search").focus();
document.getElementById("search").addEventListener("focus", event => event.target.select());
document.getElementById("search").addEventListener("keydown", async function (event) {
	if (event.key != "Enter") return;
	
	const query = this.value.trim();
	if (!query) return;
	if (query == lastQuery) return;
	lastQuery = query;
	
	document.querySelectorAll("tbody").forEach(e => Array.from(e.children).forEach(e => e.remove()));
	document.querySelectorAll(".loading").forEach(e => e.style.visibility = "visible");
	document.querySelectorAll(".badge").forEach(e => e.innerText = "0");
	
	fetchGuia(query, state, 1)
	.then(r => {
		if (!r || !r.items) return;
		
		placeGuia(r.items);
		for (let i=2; i<=r.total_paginas; i++) {
			fetchGuia(query, state, i).then(r => placeGuia(r.items));
		}
	})
	.finally(() => document.querySelector("#guiatab .loading").style.visibility = "hidden");
	
	fetch(`${URL}/ifood?q=${query}&city=${city}, ${state}`, {headers: {Authorization: licenca}})
	.then(r => r.json())
	.then(r => {
		if (!r || !r.length) return;
		
		r.forEach(e => {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td><img class="materialboxed" style=${e.imagem ? "width:80px;height:80px;" : "width:0;height:0;"} src="${e.imagem}"></td>
							<td>${e.nome}</td>
							<td>R$${e.preco_original}</td>
							<td>R$${e.preco_final}</td>
							<td>${e.farmacia}</td>`;
			document.getElementById("ifood").appendChild(tr);
			document.querySelector("[href='#ifoodtab'] span").innerText = document.getElementById("ifood").children.length;
			M.Materialbox.init(tr.querySelector(".materialboxed"));
		});
	})
	.finally(() => document.querySelector("#ifoodtab .loading").style.visibility = "hidden");
	
	fetch(`${URL}/pbm?q=${query}`, {headers: {Authorization: licenca}})
	.then(r => r.json())
	.then(r => {
		if (!r || !r.length) return;
		
		r.forEach(e => {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td>${e.nome}</td>
							<td>${e.programa}</td>
							<td>${e.autorizador}</td>
							<td>${e.desconto}</td>
							<td>${e.info}</td>
							<td>${e.laboratorio}</td>
							<td>${e.ean}</td>`;
			document.getElementById("pbm").appendChild(tr);
		});
		document.querySelector("[href='#pbmtab'] span").innerText = document.getElementById("pbm").children.length;
	})
	.finally(() => document.querySelector("#pbmtab .loading").style.visibility = "hidden");
	
	fetch(`${URL}/distribuidoras?q=${query}`, {headers: {Authorization: licenca}})
	.then(r => r.json())
	.then(r => {
		if (!r || !r.length) return;
		
		r.sort((a, b) => a.preco_nf - b.preco_nf);
		
		r.forEach(e => {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td>${e.nome}</td>
							<td>${e.distribuidora}</td>
							<td>${e.estoque}</td>
							<td>R$${e.preco_nf}</td>
							<td>${e.fornecedor}</td>
							<td>${e.ean}</td>
							<td>${e.validade || ""}</td>`;
			document.getElementById("distribuidoras").appendChild(tr);
		});
		document.querySelector("[href='#distribuidorastab'] span").innerText = document.getElementById("distribuidoras").children.length;
	})
	.finally(() => document.querySelector("#distribuidorastab .loading").style.visibility = "hidden");
});

async function fetchGuia(query, state, p) {
	try {
		let r = await fetch(`https://guiadafarmaciadigital.com.br/wp-json/guiadigital/v1/busca-produto?qtdeitens=30&pagina=${p}&estado=${state}&termo=${query}`);
		if (r.status != 200) {
			console.log(await r.text());
			return;
		}
		
		r = await r.json();
		if (r.status != true) {
			console.log(r);
			return;
		}
		
		return {
			total_paginas: r.total_paginas,
			items: r.data.map(e => {
				return {
					tipo: e.tipo_produto,
					nome: e.produto,
					apresentacao: e.apresentacao,
					ean: e.codigo_barras,
					fabricante: e.laboratorio,
					PF: e.precofabricaestado,
					PMC: e.precomaximoestado,
					principio_ativo: e.principio_ativo,
					id_apresentacao: String(e.id_apresentacao).padStart(9, "0")
				};
			})
		};
	}
	catch (e) {
		console.log(e);
	}
}

function placeGuia(items) {
	for (const e of items) {
		const imgSrc = ({
			"REFERÊNCIA": "imgs/referencia.png",
			"GENÉRICO": "imgs/generico.png",
			"SIMILAR": "imgs/similar.png",
			"OUTRO": "imgs/outro.png",
		})[e.tipo];
		
		const tr = document.createElement("tr");
		tr.innerHTML = `<td><img src=${imgSrc}></td>
						<td>${e.nome}</td>
						<td>${e.apresentacao}</td>
						<td>${e.principio_ativo}</td>
						<td>${e.fabricante}</td>
						<td>${e.ean}</td>
						<td>R$${e.PF}</td>
						<td>R$${e.PMC}</td>
						<td><button data-target="bula" class="btn blue modal-trigger" onclick="placeBula('${e.id_apresentacao}', '${e.nome}', '${e.apresentacao}')">📑</button></td>`;
		document.getElementById("guia").appendChild(tr);
	}
	
	document.querySelector("[href='#guiatab'] span").innerText = document.getElementById("guia").children.length;
}

async function fetchBula(id_apresentacao) {
	try {
		let r = await fetch(`https://guiadafarmaciadigital.com.br/wp-json/guiadigital/v1/produto-relacionado?qtdeitens=30&pagina=1&estado=MG&id_apresentacao=${id_apresentacao}`);
		r = await r.json();
		
		if (r.status != true) {
			console.log(r);
			response.send([]);
			return;
		}
		
		const bula_itens = {};
		for (const item of r.data[0].bula.bula_itens) {
			bula_itens[item.codigo] = item.texto;
		}
		
		return {
			composicao: bula_itens[1],
			indicacao: bula_itens[2],
			posologia: bula_itens[7],
			acao: bula_itens[3],
			armazenamento: bula_itens[6],
			pdf: r.data[0].bula.bula_arquivo,
			
			ncm: r.data[0].ncm,
			cest: r.data[0].cest,
			registro_ms: r.data[0].regms,
			tarja: r.data[0].tarja,
		};;
	}
	catch (e) {
		console.log(e);
	}
}

async function placeBula(id_apresentacao, nome, apresentacao) {
	document.getElementById("bula-nome").innerText = `${nome} ${apresentacao}`;
	document.getElementById("composicao").innerHTML = "";
	document.getElementById("indicacao").innerHTML = "";
	document.getElementById("posologia").innerHTML = "";
	document.getElementById("acao").innerHTML = "";
	document.getElementById("armazenamento").innerHTML = "";
	document.getElementById("pdf").href = "";
	document.getElementById("ncm").innerText = "";
	document.getElementById("cest").innerText = "";
	document.getElementById("tarja").innerText = "";
	document.getElementById("registro_ms").innerText = "";
	
	const r = await fetchBula(id_apresentacao);
	document.getElementById("composicao").innerHTML = r.composicao || "";
	document.getElementById("indicacao").innerHTML = r.indicacao || "";
	document.getElementById("posologia").innerHTML = r.posologia || "";
	document.getElementById("acao").innerHTML = r.acao || "";
	document.getElementById("armazenamento").innerHTML = r.armazenamento || "";
	document.getElementById("pdf").href = r.pdf;
	document.getElementById("ncm").innerText = r.ncm;
	document.getElementById("cest").innerText = r.cest;
	document.getElementById("tarja").innerText = r.tarja;
	document.getElementById("registro_ms").innerText = r.registro_ms;
}

function loadConfig() {
	state = localStorage.getItem("estado") || "SP";
	city = localStorage.getItem("cidade") || "São Paulo";
	licenca = localStorage.getItem("licenca") || "";
	
	document.getElementById("estado").value = state;
	document.getElementById("cidade").value = city;
	document.getElementById("licenca").value = licenca;
}

async function saveConfig() {
	city = document.getElementById("cidade").value?.trim() || "";
	state = document.getElementById("estado").value?.toUpperCase()?.trim() || "";
	licenca = document.getElementById("licenca").value?.trim() || "";
	
	localStorage.setItem("cidade", city);
	localStorage.setItem("estado", state);
	localStorage.setItem("licenca", licenca);
	document.getElementById("config").style.display = "none";
}