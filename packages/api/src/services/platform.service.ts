import config from "../config";

export interface PlatformSetting {
  id: string;
  fee_charge_state_callback_url: string;
}

async function getPlatformConfig(userId: string): Promise<PlatformSetting> {
  // mock
  return {
    id: userId,
    fee_charge_state_callback_url: `${config.url.platformService}/callback`,
  };
}

const platformService = { getPlatformConfig };

export default platformService;
