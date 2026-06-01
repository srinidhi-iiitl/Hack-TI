import { parseAssistantCommand } from '../services/assistantService.js';

export const handleAssistantCommand = async (req, res) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({
      action: 'unknown',
      response: 'Command is required.',
      message: 'Command is required.',
    });
  }

  return res.status(200).json(parseAssistantCommand(command));
};
