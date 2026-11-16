// Identificação do prestador (DL 7/2004, art. 10.º), lida das variáveis de ambiente
// para não ficar no código. Pública: é o que aparece no rodapé.
module.exports = (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).json({
        name: process.env.LEGAL_NAME || '',
        nif: process.env.LEGAL_NIF || '',
        address: process.env.LEGAL_ADDRESS || '',
        email: process.env.SUPPORT_EMAIL || 'support@store.4online.pt',
    });
};
