export type AuthUser = {
    id: string;
    username: string;
    role: 'superuser' | 'Prosecutor' | 'Secretary' | 'PS';
    role_label: string;
    is_active: boolean;
    name: string | null;
};

export type PageProps = {
    auth: {
        user: AuthUser | null;
        can: {
            view_dashboard: boolean;
            manage_users: boolean;
            manage_assignments: boolean;
            manage_offenses: boolean;
            process_server_scope: boolean;
            case_management: boolean;
            review_subpoenas: boolean;
            review_resolutions: boolean;
            view_reports: boolean;
            view_audit: boolean;
        };
    };
    flash: {
        errors: Record<string, string[]>;
    };
};
