import { makeStyles } from 'tss-react/mui';

export default makeStyles()((theme) => ({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  containerMap: {
    flexBasis: '40%',
    flexShrink: 0,
  },
  containerMain: {
    overflow: 'auto',
  },
  header: {
    position: 'sticky',
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  columnAction: {
    width: '1%',
    paddingLeft: theme.spacing(1),
    '@media print': {
      display: 'none',
    },
  },
  columnActionContainer: {
    display: 'flex',
  },
  filter: {
    display: 'inline-flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    padding: theme.spacing(3, 2, 2),
    '@media print': {
      display: 'none !important',
    },
  },
  filterItem: {
    minWidth: 0,
    flex: `1 1 ${theme.dimensions.filterFormWidth}`,
  },
  filterButtons: {
    display: 'flex',
    gap: theme.spacing(1),
    flex: `1 1 ${theme.dimensions.filterFormWidth}`,
  },
  filterButton: {
    flexGrow: 1,
  },
  chart: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  summarySection: {
    padding: theme.spacing(3),
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(30px) saturate(180%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  },
  premiumTable: {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    '& .MuiTableCell-head': {
      backgroundColor: '#f1f5f9',
      color: '#000000',
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontSize: '0.75rem',
      borderBottom: '2px solid rgba(0, 0, 0, 0.15)',
    },
    '& .MuiTableCell-body': {
      color: '#000000',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    '& .MuiTableRow-root:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  actionCellPadding: {
    '&.MuiTableCell-body': {
      paddingTop: 0,
      paddingBottom: 0,
    },
    '@media print': {
      display: 'none',
    },
  },
}));
