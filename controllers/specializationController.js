const { connectDB, sql } = require('../db');


const addSpecialization = async (req, res) => {
    try {
        const { name, description } = req.body;
            
        if (!name) {
            return res.status(200).json({ success: false, message: "Specialization name is required" });
        }

        const pool = await connectDB();
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || '')
            .query(`
                INSERT INTO Specializations (Name, Description) 
                VALUES (@Name, @Description)
            `);

        return res.status(201).json({ success: true, message: "Specialization added successfully." });
    } catch (error) {
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

//     
const getSpecializations = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .query(`SELECT SpecializationId, Name, Description FROM Specializations `);

        return res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

module.exports = {
    addSpecialization,  
    getSpecializations
};