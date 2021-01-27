/* eslint-disable prettier/prettier */

// For the purposes of queryring APIs
class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        const queryObj = { ...this.queryString }
        const excludedFields = ["page", "sort", "limit", "fields"]

        excludedFields.forEach(el => delete queryObj[el])

        // ADVANCED FILTERING
        let queryStr = JSON.stringify(queryObj);
        queryStr = JSON.parse(queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`));

        // console.log(queryStr, queryObj)
        this.query = this.query.find(queryStr)
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(",").join(" ")
            // console.log(sortBy)
            this.query = this.query.sort(sortBy)
        } else {
            this.query = this.query.sort("-createdAt")
        }
        return this;
    }

    limitFields() {
        // FIELD LIMITING i.e selecting fields to be returned from backend
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(",").join(" ");
            // console.log(fields)
            this.query = this.query.select(fields)
        } else {
            this.query = this.query.select("-__v");
        }
        return this;
    }

    paginate() {
        // PAGINATION
        // Pagination is used to selectively return a group of objects(documents) from a large database collection
        // page is used rather than skip for users exp, limit is no of objects to return
        // page rep current page the required object is, skip rep the number of objects to skip before getting to the desired no of objects
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        // skip formula
        const skip = (page - 1) * limit;
        // console.log(skip, limit)
        this.query = this.query.skip(skip).limit(limit)

        return this;

        // cant use this in a class tho, cause of await function
        // error handling in case a user request more objects than there exists in the database
        // if (req.query.page) {
        //     const numOfTours = await Tour.countDocuments();
        //     if (skip >= numOfTours) throw new Error("Page does not exist");
        // }
    }
}

module.exports = APIFeatures;