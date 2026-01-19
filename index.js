const express = require('express');
const { supabase } = require('./database');
const app = express();
const port = 3000;

app.use(express.json());

// 1. Consultar Crédito (Para Ventas)
app.get('/clients/:id/credit', async (req, res) => {
    const clientId = parseInt(req.params.id);
    
    const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

    if (error || !client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const availableCredit = client.credilim - client.deuda;
    
    res.json({
        id: client.id,
        name: client.name,
        creditLimit: client.credilim,
        currentDebt: client.deuda,
        availableCredit: availableCredit,
        canBuy: availableCredit > 0
    });
});

// 2. Registrar Cargo (Confirmar Venta)
app.post('/charges', async (req, res) => {
    const { clientId, amount } = req.body;
    
    if (!clientId || !amount || amount <= 0) {
        return res.status(400).json({ error: "Datos inválidos" });
    }

    // 1. Obtener cliente
    const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

    if (fetchError || !client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const newDebt = client.deuda + amount;

    // 2. Verificar límite
    if (newDebt > client.credilim) {
        return res.status(400).json({ 
            error: "Crédito insuficiente", 
            currentDebt: client.deuda,
            limit: client.credilim
        });
    }

    // 3. Actualizar deuda
    const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({ deuda: newDebt })
        .eq('id', clientId)
        .select()
        .single();

    if (updateError) {
         return res.status(500).json({ error: "Error al procesar el cargo" });
    }

    res.json({
        message: "Cargo aprobado",
        newDebt: updatedClient.deuda,
        availableCredit: updatedClient.credilim - updatedClient.deuda
    });
});

app.listen(port, () => {
  console.log(`Credit Service listening on port ${port}`);
});
