import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '../common/components/LocalizationProvider';
import BaseCommandView from './components/BaseCommandView';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useCatch } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useSelector } from 'react-redux';
import { getSmartIgnitionCommand } from '../common/util/smartCommands';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BlockIcon from '@mui/icons-material/Block';
import FlashOnIcon from '@mui/icons-material/FlashOn';

const CommandDevicePage = () => {
  const navigate = useNavigate();
  const { classes } = useSettingsStyles();
  const t = useTranslation();

  const { id } = useParams();

  const [savedId, setSavedId] = useState(0);
  const [item, setItem] = useState({});

  const device = useSelector((state) => state.devices.items[id]);

  const handleIgnition = useCatch(async (stop = true) => {
    const command = getSmartIgnitionCommand(device, stop);
    await fetchOrThrow('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    navigate(-1);
  });

  const handleSend = useCatch(async () => {
    let command;
    if (savedId) {
      const response = await fetchOrThrow(`/api/commands/${savedId}`);
      command = await response.json();
    } else {
      command = item;
    }

    command.deviceId = parseInt(id, 10);

    await fetchOrThrow('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    navigate(-1);
  });

  const validate = () => savedId || (item && item.type);

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'deviceCommand']}>
      <Container maxWidth="xs" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlashOnIcon color="primary" /> One-Tap Ignition Control
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: 'flex', gap: 2, pb: 3 }}>
            <Button
              fullWidth
              variant="contained"
              color="error"
              startIcon={<BlockIcon />}
              onClick={() => handleIgnition(true)}
              sx={{ borderRadius: '12px', fontWeight: 900, py: 1.5 }}
            >
              Stop Engine
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleIgnition(false)}
              sx={{ borderRadius: '12px', fontWeight: 900, py: 1.5 }}
            >
              Resume
            </Button>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
             <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <BaseCommandView
              deviceId={id}
              item={item}
              setItem={setItem}
              includeSaved
              savedId={savedId}
              setSavedId={setSavedId}
            />
          </AccordionDetails>
        </Accordion>
        <div className={classes.buttons}>
          <Button type="button" color="primary" variant="outlined" onClick={() => navigate(-1)}>
            {t('sharedCancel')}
          </Button>
          <Button
            type="button"
            color="primary"
            variant="contained"
            onClick={handleSend}
            disabled={!validate()}
          >
            {t('commandSend')}
          </Button>
        </div>
      </Container>
    </PageLayout>
  );
};

export default CommandDevicePage;
