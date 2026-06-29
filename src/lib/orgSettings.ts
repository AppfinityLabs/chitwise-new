import OrgSettings, { IOrgSettings } from '@/models/OrgSettings';

/**
 * Fetch org settings, creating a default document if none exists yet.
 * Always returns a fully-populated settings object.
 */
export async function getOrgSettings(organisationId: string): Promise<IOrgSettings> {
    let settings = await OrgSettings.findOne({ organisationId });
    if (!settings) {
        settings = await OrgSettings.create({ organisationId });
    }
    return settings;
}
