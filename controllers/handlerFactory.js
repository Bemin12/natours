const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const getResourceName = (Model) => Model.modelName.toLowerCase();

exports.updateOne = (Model, ownerField = null) =>
  catchAsync(async (req, res, next) => {
    const resourceName = getResourceName(Model);

    const filter = { _id: req.params.id };
    if (ownerField && req.user?.role !== 'admin') {
      filter[ownerField] = req.user.id;
    }

    const doc = await Model.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError(`No ${resourceName} found with that ID`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: { [resourceName]: doc },
    });
  });

exports.deleteOne = (Model, ownerField = null) =>
  catchAsync(async (req, res, next) => {
    const resourceName = getResourceName(Model);

    const filter = { _id: req.params.id };
    if (ownerField && req.user?.role !== 'admin') {
      filter[ownerField] = req.user.id;
    }

    const doc = await Model.findOneAndDelete(filter);

    if (!doc) {
      return next(new AppError(`No ${resourceName} found with that ID`, 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    const resourceName = getResourceName(Model);

    res.status(201).json({
      status: 'success',
      data: {
        [resourceName]: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (req.query?.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    }
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;
    const resourceName = getResourceName(Model);

    if (!doc) {
      return next(new AppError(`No ${resourceName} found with that ID`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        [resourceName]: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    if (req.params.userId) filter = { user: req.params.userId };
    // EXECUTE
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const docs = await features.query;
    const resourceName = `${getResourceName(Model)}s`; // Pluralize for collections

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        [resourceName]: docs,
      },
    });
  });
