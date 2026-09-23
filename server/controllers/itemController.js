const Item = require('../models/Item');
const User = require('../models/User');

const ITEM_FIELDS = [
  'title',
  'category',
  'condition',
  'description',
  'photos',
  'price',
  'isFree',
  'openToTrades',
  'pickupLocation',
  'detailedLocation',
  'pickupCoordinates'
];

const pickItemFields = (body) => {
  const data = {};

  for (const field of ITEM_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
};

const validatePublish = (data) => {
  const errors = [];

  if (!data.title?.trim()) {
    errors.push('Title is required');
  }

  if (!data.category) {
    errors.push('Category is required');
  }

  if (!data.condition) {
    errors.push('Condition is required');
  }

  if (!data.description?.trim()) {
    errors.push('Description is required');
  }

  if (!data.pickupLocation?.trim()) {
    errors.push('Pickup location is required');
  }

  // Map coordinates are OPTIONAL.
  // Users can publish without selecting a point on the map.
  if (data.pickupCoordinates) {
    const latitude = data.pickupCoordinates.latitude;
    const longitude = data.pickupCoordinates.longitude;

    // Only validate coordinates if the user actually provided them.
    if (
      latitude !== null &&
      latitude !== undefined &&
      longitude !== null &&
      longitude !== undefined
    ) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        !Number.isFinite(lat) ||
        lat < -90 ||
        lat > 90 ||
        !Number.isFinite(lng) ||
        lng < -180 ||
        lng > 180
      ) {
        errors.push('Invalid pickup map coordinates');
      }
    }
  }

  if (
    !data.isFree &&
    (
      data.price === undefined ||
      data.price === null ||
      Number.isNaN(Number(data.price)) ||
      Number(data.price) < 0
    )
  ) {
    errors.push(
      'A valid non-negative price is required unless the item is free'
    );
  }

  if (Array.isArray(data.photos) && data.photos.length > 6) {
    errors.push('Maximum 6 photos are allowed');
  }

  return errors;
};

const normaliseItemData = (data) => {
  const result = { ...data };

  result.title =
    typeof result.title === 'string'
      ? result.title.trim()
      : result.title;

  result.description =
    typeof result.description === 'string'
      ? result.description.trim()
      : result.description;

  result.pickupLocation =
    typeof result.pickupLocation === 'string'
      ? result.pickupLocation.trim()
      : result.pickupLocation;

  result.detailedLocation =
    typeof result.detailedLocation === 'string'
      ? result.detailedLocation.trim()
      : result.detailedLocation;

  // Map coordinates are optional.
  // Keep them null if the user did not select a map point.
  if (result.pickupCoordinates) {
    const latitude = result.pickupCoordinates.latitude;
    const longitude = result.pickupCoordinates.longitude;

    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined ||
      latitude === '' ||
      longitude === ''
    ) {
      result.pickupCoordinates = {
        latitude: null,
        longitude: null
      };
    } else {
      result.pickupCoordinates = {
        latitude: Number(latitude),
        longitude: Number(longitude)
      };
    }
  }

  result.isFree = Boolean(result.isFree);
  result.openToTrades = Boolean(result.openToTrades);

  result.price = result.isFree
    ? 0
    : Number(result.price || 0);

  return result;
};

const getItems = async (req, res) => {
  try {
    const {
      category,
      search,
      condition,
      sort = 'newest'
    } = req.query;

    const filter = {
      status: 'available'
    };

    if (category && category !== 'All Items') {
      filter.category = category;
    }

    if (condition) {
      filter.condition = condition;
    }

    if (search?.trim()) {
      filter.title = {
        $regex: search.trim(),
        $options: 'i'
      };
    }

    const sortMap = {
      newest: {
        createdAt: -1
      },
      priceAsc: {
        price: 1,
        createdAt: -1
      },
      priceDesc: {
        price: -1,
        createdAt: -1
      }
    };

    const items = await Item.find(filter)
      .populate(
        'owner',
        'fullName college rating profilePicture'
      )
      .sort(sortMap[sort] || sortMap.newest);

    res.status(200).json(items);
  } catch (error) {
    console.error('Get items error:', error);

    res.status(500).json({
      message: 'Server error fetching items'
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate(
        'owner',
        'fullName college rating profilePicture'
      );

    if (!item) {
      return res.status(404).json({
        message: 'Item not found'
      });
    }

    const isOwner =
      item.owner?._id?.toString() === req.user.id;

    const isAdmin =
      req.user.role === 'admin';

    if (
      item.status !== 'available' &&
      !isOwner &&
      !isAdmin
    ) {
      return res.status(404).json({
        message: 'Item not found'
      });
    }

    res.status(200).json(item);
  } catch (error) {
    console.error('Get item error:', error);

    res.status(400).json({
      message: 'Invalid item ID'
    });
  }
};

const createItem = async (req, res) => {
  try {
    const mode =
      req.body.mode === 'draft'
        ? 'draft'
        : 'publish';

    let data = normaliseItemData(
      pickItemFields(req.body)
    );

    /*
     * DRAFT
     * -----
     * Drafts do NOT require:
     * - title
     * - category
     * - condition
     * - description
     * - pickup location
     * - map location
     * - price
     *
     * The user can save an incomplete listing.
     */

    if (mode === 'publish') {
      const errors = validatePublish(data);

      if (errors.length) {
        return res.status(400).json({
          message: errors.join('. ')
        });
      }
    }

    const user = await User.findById(req.user.id)
      .select('college');

    const newItem = new Item({
      ...data,
      owner: req.user.id,
      university: user?.college || '',
      status:
        mode === 'draft'
          ? 'draft'
          : 'pending'
    });

    await newItem.save();

    res.status(201).json({
      message:
        mode === 'draft'
          ? 'Draft saved successfully!'
          : 'Item submitted for admin approval!',
      item: newItem
    });
  } catch (error) {
    console.error('Create item error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Please check the listing fields.'
      });
    }

    res.status(400).json({
      message: error.message || 'Server error creating item'
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: 'Item not found'
      });
    }

    if (
      item.owner.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not authorized to update this item'
      });
    }

    if (
      item.status === 'lent' &&
      req.user.role !== 'admin'
    ) {
      return res.status(400).json({
        message:
          'A lent item cannot be edited until it is returned.'
      });
    }

    const data = normaliseItemData(
      pickItemFields(req.body)
    );

    const mode =
      req.body.mode === 'draft'
        ? 'draft'
        : 'publish';

    if (mode === 'publish') {
      const merged = {
        ...item.toObject(),
        ...data
      };

      const errors = validatePublish(merged);

      if (errors.length) {
        return res.status(400).json({
          message: errors.join('. ')
        });
      }
    }

    Object.assign(item, data);

    if (req.user.role !== 'admin') {
      item.status =
        mode === 'draft'
          ? 'draft'
          : 'pending';
    }

    await item.save();

    res.status(200).json({
      message:
        mode === 'draft'
          ? 'Draft updated successfully!'
          : 'Listing updated and sent for admin approval.',
      item
    });
  } catch (error) {
    console.error('Update item error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Please check the listing fields.'
      });
    }

    res.status(400).json({
      message:
        error.message ||
        'Server error updating item'
    });
  }
};

const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: 'Item not found'
      });
    }

    if (
      item.owner.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message:
          'Not authorized to delete this item'
      });
    }

    if (
      item.status === 'lent' &&
      req.user.role !== 'admin'
    ) {
      return res.status(400).json({
        message:
          'A lent item cannot be deleted until it is returned.'
      });
    }

    await Item.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);

    res.status(500).json({
      message: 'Server error deleting item'
    });
  }
};

const getMyItems = async (req, res) => {
  try {
    const items = await Item.find({
      owner: req.user.id
    }).sort({
      updatedAt: -1,
      createdAt: -1
    });

    res.status(200).json(items);
  } catch (error) {
    console.error('Get my items error:', error);

    res.status(500).json({
      message: 'Server error fetching your items'
    });
  }
};

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getMyItems
};