const Event = require("../models/event");
const OrganizerProfile = require("../models/organizer");
const User = require("../models/user");
const Fuse = require("fuse.js");

exports.createEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      eligibility,
      registrationDeadline,
      startDate,
      endDate,
      registrationLimit,
      registrationFee,
      tags,
      venue,
      isOnline,
      category,
      customFields,
      customForm,
      merchandiseItems,
      merchandise
    } = req.body;

    const organizer = await OrganizerProfile.findOne({ user: req.user.id });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const event = await Event.create({
      name,
      description,
      type,
      eligibility,
      registrationDeadline,
      startDate,
      endDate,
      registrationLimit,
      registrationFee,
      organizer: organizer._id,
      tags: tags || [],
      venue: venue || '',
      isOnline: isOnline || false,
      category: category || '',
      status: "DRAFT",
      customFields: customFields || customForm || [],
      merchandiseItems: merchandiseItems || merchandise || null
    });

    await event.populate("organizer");

    res.status(201).json({
      message: "Event created successfully",
      event
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.publishEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id).populate("organizer");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    if (!event.organizer._id.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized to publish this event" });
    }

    if (!organizer.isActive) {
      return res.status(403).json({ message: "Your organizer account is disabled. Contact admin to re-enable it." });
    }

    if (event.status !== "DRAFT") {
      return res.status(400).json({ message: "Only draft events can be published" });
    }

    event.status = "PUBLISHED";
    event.publishedAt = new Date();
    await event.save();


    if (organizer.discordWebhookUrl) {
      try {
        const axios = require('axios');

        const discordEmbed = {
          content: `**New Event Published: ${event.name}**`,
          embeds: [{
            title: event.name,
            description: event.description ? (event.description.length > 200 ? event.description.substring(0, 200) + '...' : event.description) : 'No description',
            color: 0xd9683a,
            fields: [
              { name: 'Date', value: new Date(event.startDate).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }), inline: true },
              { name: 'Type', value: event.type, inline: true },
              { name: 'Fee', value: event.registrationFee ? `Rs. ${event.registrationFee}` : 'Free', inline: true },
              { name: 'Venue', value: event.isOnline ? 'Online' : (event.venue || 'TBA'), inline: true },
              { name: 'Eligibility', value: event.eligibility, inline: true },
              { name: 'Deadline', value: new Date(event.registrationDeadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }), inline: true }
            ],
            footer: { text: `${organizer.organizerName}` },
            timestamp: new Date().toISOString()
          }]
        };

        await axios.post(organizer.discordWebhookUrl, discordEmbed);
        console.log(`Event ${event.name} posted to Discord successfully`);
      } catch (discordError) {
        console.error('Failed to post to Discord:', discordError.message);
        // Don't fail publish if Discord post fails
      }
    }

    res.json({
      message: "Event published successfully",
      event
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    if (!event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized to update this event" });
    }

    // Draft events
    if (event.status === "DRAFT") {
      Object.assign(event, req.body);
    }

    // Published events
    else if (event.status === "PUBLISHED") {

      if (req.body.description !== undefined) {
        event.description = req.body.description;
      }

      if (
        req.body.registrationDeadline !== undefined &&
        new Date(req.body.registrationDeadline) > new Date(event.registrationDeadline)
      ) {
        event.registrationDeadline = req.body.registrationDeadline;
      }

      if (
        req.body.registrationLimit !== undefined &&
        req.body.registrationLimit >= event.registrationLimit
      ) {
        event.registrationLimit = req.body.registrationLimit;
      }

      if (req.body.status === "CLOSED") {
        event.status = "CLOSED";
      }
    }

    // Ongoing / Completed events
    else if (["ONGOING", "COMPLETED"].includes(event.status)) {
      if (
        req.body.status &&
        ["COMPLETED", "CLOSED"].includes(req.body.status)
      ) {
        event.status = req.body.status;
      } else {
        return res.status(400).json({
          message: "Cannot edit ongoing or completed events"
        });
      }
    }

    await event.save();

    if (["COMPLETED", "CLOSED"].includes(event.status)) {
      const Registration = require("../models/registration");
      await Registration.updateMany(
        { event: event._id, status: { $in: ["REGISTERED", "APPROVED"] } },
        { $set: { status: "COMPLETED" } }
      );
    }

    if (event.status === "CANCELLED") {
      const Registration = require("../models/registration");
      await Registration.updateMany(
        { event: event._id, status: { $in: ["REGISTERED", "APPROVED", "PENDING"] } },
        { $set: { status: "CANCELLED" } }
      );
    }

    res.json({
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrganizerEvents = async (req, res) => {
  try {
    const organizer = await OrganizerProfile.findOne({ user: req.user.id });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const events = await Event.find({ organizer: organizer._id })
      .populate("organizer")
      .sort({ createdAt: -1 });


    const Registration = require("../models/registration");
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const registrationCount = await Registration.countDocuments({
          event: event._id,
          status: { $in: ["REGISTERED", "COMPLETED", "APPROVED", "PENDING"] }
        });

        const pendingCount = await Registration.countDocuments({
          event: event._id,
          status: "PENDING"
        });

        // Calculate total revenue
        const revenueResult = await Registration.aggregate([
          {
            $match: {
              event: event._id,
              status: { $in: ["REGISTERED", "APPROVED", "COMPLETED"] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amountPaid" }
            }
          }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        const eventObj = event.toObject();
        eventObj.registrationCount = registrationCount;
        eventObj.pendingCount = pendingCount;
        eventObj.totalRevenue = totalRevenue;
        return eventObj;
      })
    );

    res.json(eventsWithCounts);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEventDetail = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.browseEvents = async (req, res) => {
  try {
    const { search, type, eligibility, dateRange, followedOnly, sort } = req.query;

    let filter = { status: { $in: ["PUBLISHED", "ONGOING"] } };


    if (type && type !== 'all') filter.type = type;
    if (eligibility && eligibility !== 'all') filter.eligibility = eligibility;

    if (dateRange) {
      const [startDate, endDate] = dateRange.split(",");
      filter.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }


    if (followedOnly && req.user) {
      const user = await User.findById(req.user.id)
        .populate("followedOrganizers");

      if (user && user.followedOrganizers.length > 0) {
        const followedIds = user.followedOrganizers.map(org => org._id);
        filter.organizer = { $in: followedIds };
      }
    }

    let query = Event.find(filter).populate("organizer");


    if (sort === "trending") {
      query = query.sort({ registrationCount: -1 });
    } else if (sort === "newest") {
      query = query.sort({ createdAt: -1 });
    } else if (sort === "upcoming") {
      query = query.sort({ startDate: 1 });
      // Personalized recommendations
      const user = await User.findById(req.user.id);
      const userInterests = user?.interests || [];
      const followedOrgIds = user?.followedOrganizers.map(id => id.toString()) || [];


      const events = await query;


      const scoredEvents = events.map(event => {
        let score = 0;


        if (followedOrgIds.includes(event.organizer._id.toString())) {
          score += 10;
        }

        if (event.tags && event.tags.length > 0 && userInterests.length > 0) {
          const matchingTags = event.tags.filter(tag =>
            userInterests.some(interest =>
              tag.toLowerCase().includes(interest.toLowerCase()) ||
              interest.toLowerCase().includes(tag.toLowerCase())
            )
          );
          score += matchingTags.length * 5;
        }


        const daysSinceCreated = (Date.now() - new Date(event.createdAt)) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 5 - daysSinceCreated);

        return { ...event.toObject(), recommendationScore: score };
      });


      scoredEvents.sort((a, b) => b.recommendationScore - a.recommendationScore);
      return res.json(scoredEvents);
    }

    const events = await query;


    if (search && search.trim()) {
      const eventsData = events.map(e => {
        const obj = e.toObject ? e.toObject() : e;
        // Flatten organizer name for search
        obj._organizerName = obj.organizer?.organizerName || '';
        return obj;
      });

      const fuse = new Fuse(eventsData, {
        keys: [
          { name: 'name', weight: 0.4 },
          { name: '_organizerName', weight: 0.3 },
          { name: 'description', weight: 0.2 },
          { name: 'tags', weight: 0.1 }
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2
      });

      const results = fuse.search(search.trim());
      return res.json(results.map(r => r.item));
    }

    res.json(events);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTrendingEvents = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const events = await Event.find({
      status: "PUBLISHED",
      createdAt: { $gte: twentyFourHoursAgo }
    })
      .populate("organizer")
      .sort({ registrationCount: -1 })
      .limit(5);

    res.json(events);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrganizerPublicEvents = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const events = await Event.find({
      organizer: organizerId,
      status: "PUBLISHED"
    })
      .populate("organizer")
      .sort({ startDate: 1 });

    res.json({
      events: events,
      total: events.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel event
exports.cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    if (!event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized to cancel this event" });
    }

    if (!["DRAFT", "PUBLISHED"].includes(event.status)) {
      return res.status(400).json({ message: "Only draft or published events can be cancelled" });
    }

    event.status = "CANCELLED";
    await event.save();

    // Cancel active registrations
    const Registration = require("../models/registration");
    const activeRegs = await Registration.find({
      event: id,
      status: { $in: ["REGISTERED", "PENDING", "APPROVED"] }
    }).populate("participant");

    for (const reg of activeRegs) {
      reg.status = "CANCELLED";
      await reg.save();
    }

    res.json({
      message: "Event cancelled successfully",
      event,
      cancelledRegistrations: activeRegs.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};