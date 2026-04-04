const Setting = require("../schema/setting");
const {
  ok,
  badRequest,
  notFound,
  serverError,
} = require("../shared/http/response");

// Default settings to seed the database (kosong - admin isi sendiri)
const defaultSettings = [
  // General
  { key: "site_name", value: "", group: "general", label: "Nama Website", type: "text" },
  { key: "tagline", value: "", group: "general", label: "Tagline", type: "text" },
  { key: "description", value: "", group: "general", label: "Deskripsi Website", type: "textarea" },

  // Contact
  { key: "email", value: "", group: "contact", label: "Email", type: "email" },
  { key: "phone", value: "", group: "contact", label: "Telepon", type: "text" },
  { key: "address", value: "", group: "contact", label: "Alamat", type: "textarea" },

  // Social Media
  { key: "facebook", value: "", group: "social", label: "Facebook", type: "url" },
  { key: "instagram", value: "", group: "social", label: "Instagram", type: "url" },
  { key: "youtube", value: "", group: "social", label: "YouTube", type: "url" },
  { key: "twitter", value: "", group: "social", label: "Twitter / X", type: "url" },
];

// Get all settings
const getAllSettings = async (req, res) => {
  try {
    let settings = await Setting.findAll({
      order: [["group", "ASC"], ["id", "ASC"]],
    });

    // If no settings exist, seed with defaults
    if (settings.length === 0) {
      await Setting.bulkCreate(defaultSettings);
      settings = await Setting.findAll({
        order: [["group", "ASC"], ["id", "ASC"]],
      });
    }

    // Group settings by their group field
    const groupedSettings = settings.reduce((acc, setting) => {
      const group = setting.group;
      if (!acc[group]) {
        acc[group] = {};
      }
      acc[group][setting.key] = setting.value;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: groupedSettings,
      raw: settings,
    });
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

// Get setting by key
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({
      where: { key },
    });

    if (!setting) {
      return notFound(res, "Setting not found");
    }

    return ok(res, setting);
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

// Get settings by group
const getSettingsByGroup = async (req, res) => {
  try {
    const { group } = req.params;
    const settings = await Setting.findAll({
      where: { group },
      order: [["id", "ASC"]],
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: settingsMap,
      raw: settings,
    });
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

// Update single setting
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const [setting, created] = await Setting.upsert(
      {
        key,
        ...req.body,
      },
      {
        returning: true,
      }
    );

    return ok(
      res,
      setting,
      created ? "Setting created" : "Setting updated"
    );
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

// Bulk update settings
const bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return badRequest(res, "Settings array is required");
    }

    const results = [];

    for (const setting of settings) {
      const { key, value } = setting;

      if (!key) continue;

      const [updated] = await Setting.upsert(
        {
          key,
          value,
          group: setting.group,
          label: setting.label,
          type: setting.type,
        },
        {
          returning: true,
        }
      );

      results.push(updated);
    }

    return ok(res, results, `${results.length} settings updated`);
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

// Save all settings from form
const saveAllSettings = async (req, res) => {
  try {
    const formData = req.body;

    // Expected format: { siteName: "value", email: "value", ... }
    const settingsToUpdate = [
      { key: "site_name", value: formData.siteName, group: "general", label: "Nama Website", type: "text" },
      { key: "tagline", value: formData.tagline, group: "general", label: "Tagline", type: "text" },
      { key: "description", value: formData.description, group: "general", label: "Deskripsi Website", type: "textarea" },
      { key: "email", value: formData.email, group: "contact", label: "Email", type: "email" },
      { key: "phone", value: formData.phone, group: "contact", label: "Telepon", type: "text" },
      { key: "address", value: formData.address, group: "contact", label: "Alamat", type: "textarea" },
      { key: "facebook", value: formData.facebook, group: "social", label: "Facebook", type: "url" },
      { key: "instagram", value: formData.instagram, group: "social", label: "Instagram", type: "url" },
      { key: "youtube", value: formData.youtube, group: "social", label: "YouTube", type: "url" },
      { key: "twitter", value: formData.twitter, group: "social", label: "Twitter / X", type: "url" },
    ];

    for (const setting of settingsToUpdate) {
      if (setting.value !== undefined) {
        await Setting.upsert(setting);
      }
    }

    // Fetch updated settings
    const updatedSettings = await Setting.findAll({
      order: [["group", "ASC"], ["id", "ASC"]],
    });

    return ok(res, updatedSettings, "Settings saved successfully");
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

// Initialize/seed default settings
const initializeSettings = async (req, res) => {
  try {
    const existingSettings = await Setting.findAll();

    if (existingSettings.length > 0) {
      return res.json({
        success: true,
        message: "Settings already initialized",
        count: existingSettings.length,
      });
    }

    await Setting.bulkCreate(defaultSettings);

    return res.json({
      success: true,
      message: "Settings initialized with defaults",
      count: defaultSettings.length,
    });
  } catch (error) {
    return serverError(res, error, "Server error");
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  getSettingsByGroup,
  updateSetting,
  bulkUpdateSettings,
  saveAllSettings,
  initializeSettings,
};
