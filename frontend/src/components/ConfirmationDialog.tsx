import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface Props {
    open: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
}

export default function ConfirmationDialog({
                                               open,
                                               title,
                                               content,
                                               onConfirm,
                                               onCancel,
                                               confirmText = 'Eliminar',
                                               cancelText = 'Cancelar',
                                               loading = false
                                           }: Props) {
    return (
        <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">{content}</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={loading} color="inherit">
                    {cancelText}
                </Button>
                <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}