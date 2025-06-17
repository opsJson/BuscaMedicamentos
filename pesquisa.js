const URL = "https://cbr3emmw65uv2uzbjcfknv4iny0nuiul.lambda-url.sa-east-1.on.aws";
let config;
let lastQuery;

loadConfig();
document.getElementById("search").focus();

const tabButtons = document.querySelectorAll(".tab-button");
tabButtons.forEach(button => {
	button.addEventListener("click", () => {
		const tabId = button.getAttribute("data-tab");
		
		tabButtons.forEach(btn => btn.classList.remove("active"));
		document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
		
		button.classList.add("active");
		document.getElementById(tabId).classList.add("active");
	});
});

document.getElementById("pdf").addEventListener("click", event => {
    if (event.target.style.cursor == "not-allowed") {
        event.preventDefault();
    }
});

document.getElementById("search").addEventListener("focus", event => {
    event.target.select();
});

document.getElementById("zoomModal").addEventListener("click", () => {
    document.getElementById("zoomModal").classList.add("hidden");
});

window.onclick = function(event) {
	if (event.target === document.getElementById("bulaModal")) {
		document.getElementById("bulaModal").classList.add("hidden");
	}
	if (event.target === document.getElementById("configModal")) {
		document.getElementById("configModal").classList.add("hidden");
	}
	if (event.target === document.getElementById("configBtn")) {
		document.getElementById("configModal").classList.remove("hidden");
	}
}

document.getElementById("search").addEventListener("keydown", async function(event) {
    if (event.key != "Enter") return;
    
    const query = this.value.trim();
    if (!query) return;
    if (query == lastQuery) return;
    lastQuery = query;
    
    if (!config.license) {
        alert("Você precisa fornecer uma licença válida!");
        return;
    }
    
    document.querySelectorAll("tbody").forEach(e => {
        while (e.firstChild) {
            e.removeChild(e.firstChild);
        }
    });
    
    document.querySelectorAll(".loading").forEach(e => {
        e.style.visibility = "visible";
    });
    
    document.querySelectorAll(".badge").forEach(e => {
        e.textContent = "0";
    });
    
    try {
		await Promise.all([
			fetchGuiaData(query),
			fetchIfoodData(query),
			fetchPBMData(query),
			fetchDistribuidorasData(query)
		]);
    }
	catch (error) {
        console.log(error);
    }
});

async function fetchGuiaData(query) {
    try {
        const r = await fetchGuia(query, config.state, 1);
        if (!r || !r.items) return;
        
        placeGuia(r.items);
		
        for (let i = 2; i <= r.total_paginas; i++) {
            const additionalData = await fetchGuia(query, config.state, i);
            if (additionalData && additionalData.items) {
                placeGuia(additionalData.items);
            }
        }
    }
	finally {
        document.querySelector("#guiatab .loading").style.visibility = "hidden";
    }
}

async function fetchIfoodData(query) {
    try {
        const response = await fetch(`${URL}/ifood?q=${query}&city=${config.city}, ${config.state}`, {
            headers: {Authorization: config.license}
        });
        const r = await response.json();
        
        if (!r || !r.length) return;
        
        const ifoodContainer = document.getElementById("ifood");
        r.forEach(e => {
            const tr = document.createElement("tr");
            tr.className = "medication-card hover:bg-gray-50";
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-normal break-words text-center">${e.imagem ? `<img class="mx-auto" style="width:80px;height:80px;" src="${e.imagem}">` : '<i class="fas fa-pills text-3xl text-gray-400"></i>'}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 font-medium">${e.nome}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">R$${e.preco_original}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-green-600 font-bold">R$${e.preco_final}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.farmacia}</td>
            `;
            ifoodContainer.appendChild(tr);
			
			if (e.imagem) {
				const img = document.createElement("img");
				img.src = e.imagem;
				img.className = "mx-auto cursor-pointer";
				img.style.width = "80px";
				img.style.height = "80px";
				img.onclick = () => {
					document.getElementById("zoomedImage").src = e.imagem;
					document.getElementById("zoomModal").classList.remove("hidden");
				};
				tr.children[0].innerHTML = "";
				tr.children[0].appendChild(img);
			}
        });
		
        document.querySelector("[data-tab='ifoodtab'] span").textContent = ifoodContainer.children.length;
    }
	finally {
        document.querySelector("#ifoodtab .loading").style.visibility = "hidden";
    }
}

async function fetchPBMData(query) {
    try {
        const response = await fetch(`${URL}/pbm?q=${query}`, {
            headers: {Authorization: config.license}
        });
        const r = await response.json();
        
        if (!r || !r.length) return;
		
		const pbmNomeKey = new Set();
		const uniquePbmNomes = r.filter(item => {
			if (pbmNomeKey.has(item.nome)) {
				return false;
			}
			pbmNomeKey.add(item.nome);
			return true;
		});
        
        const pbmContainer = document.getElementById("pbm");
        uniquePbmNomes.forEach(e => {
            const tr = document.createElement("tr");
            tr.className = "medication-card hover:bg-gray-50";
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">${e.nome}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.programa}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.autorizador}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-green-600 font-bold">${e.desconto}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.info}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.laboratorio}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.ean}</td>
            `;
            pbmContainer.appendChild(tr);
        });
        
        document.querySelector("[data-tab='pbmtab'] span").textContent = pbmContainer.children.length;
    }
	finally {
        document.querySelector("#pbmtab .loading").style.visibility = "hidden";
    }
}

async function fetchDistribuidorasData(query) {
    try {
        const response = await fetch(`${URL}/distribuidoras?q=${query}`, {
            headers: {Authorization: config.license}
        });
        let r = await response.json();
        
        if (!r || !r.length) return;
        
        r.sort((a, b) => a.preco_nf - b.preco_nf);
        
        const distribuidorasContainer = document.getElementById("distribuidoras");
        r.forEach(e => {
            const tr = document.createElement("tr");
            tr.className = "medication-card hover:bg-gray-50";
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">${e.nome}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.distribuidora}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.estoque}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-green-600 font-bold">R$${e.preco_nf}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.fornecedor}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.ean}</td>
                <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.validade || ""}</td>
            `;
            distribuidorasContainer.appendChild(tr);
        });
        
        document.querySelector("[data-tab='distribuidorastab'] span").textContent = distribuidorasContainer.children.length;
    }
	finally {
        document.querySelector("#distribuidorastab .loading").style.visibility = "hidden";
    }
}

async function fetchGuia(query, state, p) {
    try {
        let response = await fetch(`https://guiadafarmaciadigital.com.br/wp-json/guiadigital/v1/busca-produto?qtdeitens=30&pagina=${p}&estado=${state}&termo=${query}`);
        if (response.status != 200) {
            console.log(await response.text());
            return null;
        }
        
        let r = await response.json();
        if (r.status != true) {
            console.log(r);
            return null;
        }
        
        return {
            total_paginas: r.total_paginas,
            items: r.data.map(e => ({
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
            }))
        };
    }
	catch (e) {
        console.log(e);
        return null;
    }
}

function placeGuia(items) {
    const guiaContainer = document.getElementById("guia");
    
    for (const e of items) {
        const imgSrc = ({
            "REFERÊNCIA": "imgs/referencia.png",
            "GENÉRICO": "imgs/generico.png",
            "SIMILAR": "imgs/similar.png",
            "OUTRO": "imgs/outro.png",
        })[e.tipo] || "imgs/outro.png";
        
        const tr = document.createElement("tr");
        tr.className = "medication-card hover:bg-gray-50";
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500"><img src="${imgSrc}" class="w-8 h-8 mx-auto"></td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">${e.nome}</td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.apresentacao}</td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.principio_ativo}</td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.fabricante}</td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">${e.ean}</td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">R$${e.PF}</td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">R$${e.PMC}</td>
            <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">
                <button class="bula-btn bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600" 
                        onclick="guiaMoreInfo('${e.id_apresentacao}', '${e.nome}', '${e.apresentacao}')">
                    <i class="fas fa-file-pdf mr-1"></i> Bula
                </button>
            </td>
        `;
        guiaContainer.appendChild(tr);
    }
    
    document.querySelector("[data-tab='guiatab'] span").textContent = guiaContainer.children.length;
}

async function guiaMoreInfo(id_apresentacao, nome, apresentacao) {
    const modal = document.getElementById("bulaModal");
    modal.classList.remove("hidden");
    
    document.getElementById("bula-nome").textContent = `${nome} ${apresentacao}`;
    document.getElementById("pdf").style.cursor = "not-allowed";
    document.getElementById("pdf").href = "#";
    
    const infoFields = ["ncm", "cest", "tarja", "registro_ms", "indicacao", "posologia", "colaterais", "aparencia"];
    infoFields.forEach(field => {
        document.getElementById(field).textContent = "Carregando...";
    });
	
	fetch(`${URL}/bula?q=${nome} ${apresentacao}`, {
		headers: {Authorization: config.license}
	})
	.then(r => r.json())
	.then(r => {
		document.getElementById("indicacao").textContent = r.indicacao || "Não disponível";
		document.getElementById("posologia").textContent = r.posologia || "Não disponível";
		document.getElementById("colaterais").textContent = r.colaterais || "Não disponível";
		document.getElementById("aparencia").textContent = r.aparencia || "Não disponível";
	});
	
	fetch(`https://guiadafarmaciadigital.com.br/wp-json/guiadigital/v1/produto-relacionado?qtdeitens=30&pagina=1&estado=MG&id_apresentacao=${id_apresentacao}`)
	.then(r => r.json())
	.then(r => {
		if (r.status === true && r.data && r.data[0]) {
            document.getElementById("pdf").style.cursor = "pointer";
            document.getElementById("pdf").href = r.data[0].bula.bula_arquivo || "#";
            document.getElementById("ncm").textContent = r.data[0].ncm || "Não disponível";
            document.getElementById("cest").textContent = r.data[0].cest || "Não disponível";
            document.getElementById("tarja").textContent = r.data[0].tarja || "Não disponível";
            document.getElementById("registro_ms").textContent = r.data[0].regms || "Não disponível";
        }
	});
}

function loadConfig() {
    config = JSON.parse(localStorage.getItem("config")) || {state: "SP", city: "São Paulo", license: ""};
    document.getElementById("estado").value = config.state || "";
    document.getElementById("cidade").value = config.city || "";
    document.getElementById("license").value = config.license || "";
}

function saveConfig() {
    config.city = document.getElementById("cidade").value?.trim() || "";
    config.state = document.getElementById("estado").value?.toUpperCase()?.trim() || "";
    config.license = document.getElementById("license").value?.trim() || "";
    localStorage.setItem("config", JSON.stringify(config));
    document.getElementById("configModal").classList.add("hidden");
}