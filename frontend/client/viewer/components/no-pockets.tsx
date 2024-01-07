import { Typography } from "@mui/material";
import React from "react";

export default function NoPockets() {
    return (
        <Typography
            sx={{ flex: '1 1 100%', pl: { sm: 2 }, pr: { xs: 1, sm: 1 }, pt: 2 }}
            variant="h6"
        >
            No pockets found.
        </Typography>
    );
}