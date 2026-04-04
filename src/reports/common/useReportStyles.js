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
    background: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(30px) saturate(180%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  premiumTable: {
    '& .MuiTableCell-head': {
      backgroundColor: 'rgba(30, 41, 59, 0.3)',
      color: 'rgba(255, 255, 255, 1)',
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      fontSize: '0.7rem',
      borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
      backdropFilter: 'blur(10px)',
    },
    '& .MuiTableCell-body': {
      color: 'rgba(255, 255, 255, 0.9)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    '& .MuiTableRow-root:hover': {
      backgroundColor: 'rgba(59, 130, 246, 0.08) !important',
      backdropFilter: 'blur(5px)',
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
