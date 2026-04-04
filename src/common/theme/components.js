export default {
  MuiUseMediaQuery: {
    defaultProps: {
      noSsr: true,
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.default,
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      sizeMedium: {
        height: '40px',
      },
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiSnackbar: {
    defaultProps: {
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'center',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 500,
      enterNextDelay: 500,
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({
        ...(theme.palette.mode === 'dark' && {
          background: 'rgba(15, 23, 42, 0.4) !important',
          backdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6) !important',
        }),
      }),
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: '28px',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        background: 'rgba(15, 23, 42, 0.9) !important',
        backdropFilter: 'blur(30px)',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        paddingTop: theme.spacing(1.5),
        paddingBottom: theme.spacing(1.5),
        '@media print': {
          color: theme.palette.alwaysDark.main,
        },
      }),
    },
  },
};
