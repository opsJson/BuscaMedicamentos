const URL = "https://cbr3emmw65uv2uzbjcfknv4iny0nuiul.lambda-url.sa-east-1.on.aws";
let config;
let lastQuery;

loadConfig();

M.FormSelect.init(document.querySelectorAll("select"));
M.Tabs.init(document.querySelectorAll(".tabs"));
M.Modal.init(document.querySelectorAll("#bula"), {inDuration: 0, outDuration: 0});
M.Modal.init(document.querySelectorAll("#config"), {inDuration: 0, outDuration: 0});
M.Collapsible.init(document.querySelectorAll(".collapsible"));

document.getElementById("pdf").addEventListener("click", event => event.target.style.cursor == "not-allowed" && event.preventDefault());
document.getElementById("search").focus();
document.getElementById("search").addEventListener("focus", event => event.target.select());
document.getElementById("search").addEventListener("keydown", async function (event) {
	if (event.key != "Enter") return;
	
	const query = this.value.trim();
	if (!query) return;
	if (query == lastQuery) return;
	lastQuery = query;
	
	if (!config.licenca) {
		alert("Você precisa fornecer uma licença válida!");
		return;
	}
	
	document.querySelectorAll("tbody").forEach(e => Array.from(e.children).forEach(e => e.remove()));
	document.querySelectorAll("#bulaaitab .flow-text").forEach(e => e.innerHTML = "");
	document.querySelectorAll(".loading").forEach(e => e.style.visibility = "visible");
	document.querySelectorAll(".badge").forEach(e => e.innerText = "0");
	
	fetchGuia(query, config.state, 1)
	.then(r => {
		if (!r || !r.items) {
			document.querySelector("#bulaaitab .loading").style.visibility = "hidden";
			return;
		}
		
		fetch(`${URL}/info?q=${r.items[0].id_principio_ativo}&apresentacao=${r.items[0].id_apresentacao}`, {headers: {Authorization: config.licenca}})
		.then(r => r.json())
		.then(r => {
			document.getElementById("indicacao").innerText = r.indicacao;
			document.getElementById("posologia").innerText = r.posologia;
			document.getElementById("colaterais").innerText = r.colaterais;
			document.getElementById("aparencia").innerText = r.aparencia;
		})
		.finally(() => document.querySelector("#bulaaitab .loading").style.visibility = "hidden");
		
		placeGuia(r.items);
		for (let i=2; i<=r.total_paginas; i++) {
			fetchGuia(query, config.state, i).then(r => placeGuia(r.items));
		}
	})
	.finally(() => document.querySelector("#guiatab .loading").style.visibility = "hidden");
	
	fetch(`${URL}/ifood?q=${query}&city=${config.city}, ${config.state}`, {headers: {Authorization: config.licenca}})
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
	
	fetch(`${URL}/pbm?q=${query}`, {headers: {Authorization: config.licenca}})
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
	
	fetch(`${URL}/distribuidoras?q=${query}`, {headers: {Authorization: config.licenca}})
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
					id_apresentacao: String(e.id_apresentacao).padStart(9, "0"),
					id_principio_ativo: e.id_principio_ativo
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
						<td><button data-target="bula" class="btn blue modal-trigger" onclick="guiaMoreInfo('${e.id_apresentacao}', '${e.nome}', '${e.apresentacao}')">📑</button></td>`;
		document.getElementById("guia").appendChild(tr);
	}
	
	document.querySelector("[href='#guiatab'] span").innerText = document.getElementById("guia").children.length;
}

async function guiaMoreInfo(id_apresentacao, nome, apresentacao) {
	document.getElementById("bula-nome").innerText = `${nome} ${apresentacao}`;
	document.getElementById("pdf").style.cursor = "not-allowed";
	document.getElementById("pdf").href = "";
	document.getElementById("ncm").innerText = "Carregando...";
	document.getElementById("cest").innerText = "Carregando...";
	document.getElementById("tarja").innerText = "Carregando...";
	document.getElementById("registro_ms").innerText = "Carregando...";
	
	try {
		let r = await fetch(`https://guiadafarmaciadigital.com.br/wp-json/guiadigital/v1/produto-relacionado?qtdeitens=30&pagina=1&estado=MG&id_apresentacao=${id_apresentacao}`);
		r = await r.json();
		
		if (r.status != true) {
			console.log(r);
			response.send([]);
			return;
		}
		
		document.getElementById("pdf").style.cursor = "pointer";
		document.getElementById("pdf").href = r.data[0].bula.bula_arquivo;
		document.getElementById("ncm").innerText = r.data[0].ncm;
		document.getElementById("cest").innerText = r.data[0].cest;
		document.getElementById("tarja").innerText = r.data[0].tarja;
		document.getElementById("registro_ms").innerText = r.data[0].regms;
	}
	catch (e) {
		console.log(e);
	}
}

function loadConfig() {
	config = JSON.parse(localStorage.getItem("config")) || {state: "SP", city: "São Paulo", licenca: ""};
	document.getElementById("estado").value = config.state;
	document.getElementById("cidade").value = config.city;
	document.getElementById("licenca").value = config.licenca;
}

async function saveConfig() {
	config.city = document.getElementById("cidade").value?.trim() || "";
	config.state = document.getElementById("estado").value?.toUpperCase()?.trim() || "";
	config.licenca = document.getElementById("licenca").value?.trim() || "";
	
	localStorage.setItem("config", JSON.stringify(config));
	document.getElementById("config").style.display = "none";
}