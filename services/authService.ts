
import { pool, isDbConfigured } from './db';

export interface User {
    id: number;
    username: string;
    displayName: string;
    role: string;
}

export const login = async (username: string, password: string): Promise<User | null> => {
    if (!isDbConfigured) {
        throw new Error('DB_NOT_CONFIGURED');
    }

    try {
        // Note: In a real production app, passwords should be hashed (e.g., bcrypt).
        // This example uses plain text for demonstration purposes as per the SQL setup.
        const res = await pool.query(
            'SELECT id, username, display_name, role FROM public.users WHERE username = $1 AND password = $2',
            [username, password]
        );
        
        if (res.rows.length > 0) {
            const row = res.rows[0];
            return {
                id: row.id,
                username: row.username,
                displayName: row.display_name,
                role: row.role
            };
        }
        return null;
    } catch (error: any) {
        console.error("Login error:", error);
        // Convert object errors to string to avoid [object Object] in UI
        const errorMessage = error.message || JSON.stringify(error);
        throw new Error(errorMessage);
    }
};
