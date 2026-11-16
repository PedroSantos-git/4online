// 4online: só o seletor de língua (PT/EN). A página é estática: o conteúdo é editado no index.html.
(function () {
	function setLang(lang) {
		var html = document.documentElement;
		html.dataset.lang = lang;
		html.lang = lang === "pt" ? "pt-PT" : "en";
		document.title = lang === "pt" ? "4online · Serviços e aplicações online" : "4online · Online services and apps";
		document.querySelectorAll("[data-set-lang]").forEach(function (b) {
			b.setAttribute("aria-pressed", String(b.dataset.setLang === lang));
		});
		// Links que têm versão própria em inglês.
		document.querySelectorAll("a[data-en]").forEach(function (a) {
			if (!a.dataset.pt) a.dataset.pt = a.getAttribute("href");
			a.setAttribute("href", lang === "en" ? a.dataset.en : a.dataset.pt);
		});
		try { localStorage.setItem("lang", lang); } catch (e) {}
	}
	document.querySelectorAll("[data-set-lang]").forEach(function (b) {
		b.addEventListener("click", function () { setLang(b.dataset.setLang); });
	});
	setLang(document.documentElement.dataset.lang === "en" ? "en" : "pt");
})();
