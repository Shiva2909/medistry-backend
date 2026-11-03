const { connectDB, sql } = require('../db');

/**
 * @function addPatientAddress
 * @description Allows a patient to securely add and save a new physical address for lab test sample collections.
 * @route POST /api/address/add
 * @access Protected (Patient)
 */
const addPatientAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { addressLine, city, state, pincode, latitude, longitude, isPrimary } = req.body;

        if (!addressLine || !pincode) {
            return res.status(400).json({ success: false, message: "AddressLine and Pincode are required fields." });
        }

        const pool = await connectDB();
        
        // If the user sets this as primary, we should unset their previous primary address to maintain data integrity
        if (isPrimary) {
            await pool.request()
                .input('UserId', sql.Int, userId)
                .query(`UPDATE PatientAddresses SET IsPrimary = 0 WHERE UserId = @UserId`);
        }

        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('AddressLine', sql.NVarChar, addressLine)
            .input('City', sql.NVarChar, city || null)
            .input('State', sql.NVarChar, state || null)
            .input('Pincode', sql.VarChar, pincode)
            .input('Latitude', sql.Decimal(10, 8), latitude || null)
            .input('Longitude', sql.Decimal(11, 8), longitude || null)
            .input('IsPrimary', sql.Bit, isPrimary ? 1 : 0)
            .query(`
                INSERT INTO PatientAddresses (UserId, AddressLine, City, State, Pincode, Latitude, Longitude, IsPrimary, IsActive)
                OUTPUT INSERTED.AddressId
                VALUES (@UserId, @AddressLine, @City, @State, @Pincode, @Latitude, @Longitude, @IsPrimary, 1)
            `);

        return res.status(201).json({ 
            success: true, 
            message: "Address successfully saved.",
            data: { addressId: result.recordset[0].AddressId }
        });

    } catch (error) {
        console.error("[Address Controller] Add Address Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function getMyAddresses
 * @description Retrieves a list of all active saved addresses for the logged-in patient.
 * @route GET /api/address/my-addresses
 * @access Protected (Patient)
 */
const getMyAddresses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const pool = await connectDB();

        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT AddressId, AddressLine, City, State, Pincode, Latitude, Longitude, IsPrimary 
                FROM PatientAddresses 
                WHERE UserId = @UserId AND IsActive = 1
                ORDER BY IsPrimary DESC, CreatedAt DESC
            `);

        return res.status(200).json({ 
            success: true, 
            message: "Addresses fetched successfully.",
            data: result.recordset 
        });

    } catch (error) {
        console.error("[Address Controller] Fetch Addresses Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function deletePatientAddress
 * @description Soft deletes a patient's address so it no longer appears in their list, 
 *              preserving historical lab booking references.
 * @route DELETE /api/address/:addressId
 * @access Protected (Patient)
 */
const deletePatientAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const addressId = req.params.addressId;

        const pool = await connectDB();
        
        const result = await pool.request()
            .input('AddressId', sql.Int, addressId)
            .input('UserId', sql.Int, userId)
            .query(`
                UPDATE PatientAddresses 
                SET IsActive = 0 
                WHERE AddressId = @AddressId AND UserId = @UserId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Address not found or unauthorized access." });
        }

        return res.status(200).json({ success: true, message: "Address removed successfully." });

    } catch (error) {
        console.error("[Address Controller] Delete Address Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

module.exports = {
    addPatientAddress,
    getMyAddresses,
    deletePatientAddress
};