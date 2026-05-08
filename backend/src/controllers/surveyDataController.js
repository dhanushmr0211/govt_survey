const { searchUlbs } = require('../models/districtUlbModel');
const { createSwitchPoint } = require('../models/switchPointModel');
const { createPole } = require('../models/poleModel');

async function searchUlbsHandler(req, res) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    const ulbs = await searchUlbs(q);
    res.json({ ulbs });
  } catch (error) {
    console.error('Error searching ULBs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createSwitchPointHandler(req, res) {
  try {
    const data = req.body;
    data.created_by = req.user?.id; // Assuming auth middleware sets req.user
    
    const newSwitchPoint = await createSwitchPoint(data);
    res.status(201).json(newSwitchPoint);
  } catch (error) {
    console.error('Error creating Switch Point:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createPoleHandler(req, res) {
  try {
    const data = req.body;
    data.created_by = req.user?.id;
    
    if (!data.switch_point_id) {
      return res.status(400).json({ error: 'switch_point_id is required' });
    }

    const newPole = await createPole(data);
    res.status(201).json(newPole);
  } catch (error) {
    console.error('Error creating Pole:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { searchUlbsHandler, createSwitchPointHandler, createPoleHandler };
